"""
Language Service
語系管理服務 - 語系檔同步、補值
"""

import json
import hashlib
import logging
from pathlib import Path
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.syslanguage import SysLanguage
from app.models.sysprofile import SysProfile
from app.core.config import settings

logger = logging.getLogger(__name__)

# 需要補值的 JSONB 多語系欄位清單
I18N_TABLES = [
    {"table": "system_codes", "columns": ["code_type_name", "code_name"]},
    {"table": "system_functions", "columns": ["func_name"]},
    {"table": "sys_profiles", "columns": ["sys_title", "sys_copyright"]},
    {"table": "user_roles", "columns": ["role_name"]},
    {"table": "system_notifications", "columns": ["notice_subject", "notice_description"]},
]


def _get_locales_dir() -> Path:
    """取得前端 locales 目錄路徑"""
    base_dir = Path(__file__).parent.parent.parent.parent  # Develop/
    return base_dir / "frontend" / "src" / "locales"


def _compute_hash(data: dict) -> str:
    """計算 JSON 資料的 SHA-256 hash"""
    json_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(json_str.encode('utf-8')).hexdigest()


class LanguageService:
    """語系管理服務"""

    @staticmethod
    def sync_locale_files(db: Session) -> Dict[str, str]:
        """
        同步語系檔案：將資料庫中啟用語系的 lang_data 寫出到 locales 目錄

        Returns:
            同步結果 {lang_code: "created" | "updated" | "unchanged" | "error"}
        """
        locales_dir = _get_locales_dir()
        results = {}

        # 取得啟用的語系列表
        profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
        if not profile or not profile.sys_languages:
            logger.warning("No sys_languages configured")
            return results

        active_langs = profile.sys_languages

        for lang_code in active_langs:
            lang = db.query(SysLanguage).filter(SysLanguage.lang_code == lang_code).first()
            if not lang or not lang.lang_data:
                logger.warning(f"Language {lang_code} not found or has no data")
                results[lang_code] = "error"
                continue

            lang_dir = locales_dir / lang_code
            lang_file = lang_dir / "translation.json"

            # 計算新資料的 hash
            new_hash = _compute_hash(lang.lang_data)

            # 比對現有檔案
            if lang_file.exists():
                try:
                    with open(lang_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                    existing_hash = _compute_hash(existing_data)

                    if existing_hash == new_hash:
                        results[lang_code] = "unchanged"
                        continue
                except Exception:
                    pass  # 檔案損壞，重新寫出

            # 寫出檔案
            try:
                lang_dir.mkdir(parents=True, exist_ok=True)
                with open(lang_file, 'w', encoding='utf-8') as f:
                    json.dump(lang.lang_data, f, ensure_ascii=False, indent=2)

                status = "updated" if lang_file.exists() else "created"
                results[lang_code] = status
                logger.info(f"Locale file synced: {lang_code} ({status})")
            except Exception as e:
                logger.error(f"Failed to sync locale file {lang_code}: {e}")
                results[lang_code] = "error"

        return results

    @staticmethod
    def backfill_language(db: Session, lang_code: str, template_lang: str = None) -> Dict[str, int]:
        """
        補值作業：為新語系在所有 JSONB 多語系欄位中補上預設值

        Args:
            lang_code: 要補值的語系代碼
            template_lang: 模板語系代碼（預設取 sys_profiles 陣列第一個）

        Returns:
            補值結果 {table_name: updated_count}
        """
        # 決定模板語系
        if not template_lang:
            profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
            template_lang = profile.sys_languages[0] if profile and profile.sys_languages else "zh-TW"

        results = {}

        for table_info in I18N_TABLES:
            table = table_info["table"]
            total_updated = 0

            for column in table_info["columns"]:
                # 用模板語系的值補上新語系
                # 只補尚未存在該語系 key 的資料
                sql = text(f"""
                    UPDATE {table}
                    SET {column} = {column} || jsonb_build_object(:lang_code, {column}->>:template_lang)
                    WHERE NOT ({column} ? :lang_code)
                    AND {column}->>:template_lang IS NOT NULL
                """)
                result = db.execute(sql, {
                    "lang_code": lang_code,
                    "template_lang": template_lang
                })
                total_updated += result.rowcount

            results[table] = total_updated
            if total_updated > 0:
                logger.info(f"Backfilled {total_updated} rows in {table} for language {lang_code}")

        db.commit()
        return results

    @staticmethod
    def get_active_languages(db: Session) -> List[Dict]:
        """
        取得啟用的語系資訊（供前端初始化用）

        Returns:
            語系資訊列表
        """
        from app.models.systemcode import SystemCode

        profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
        if not profile or not profile.sys_languages:
            return []

        active_langs = profile.sys_languages

        # 從 system_codes 取得語系的詳細資訊（含 note1 簡稱）
        lang_codes = db.query(SystemCode).filter(
            SystemCode.code_type == 'Language',
            SystemCode.code.in_(active_langs),
            SystemCode.is_active == True
        ).all()

        # 建立 code → SystemCode 的映射
        lang_map = {lc.code: lc for lc in lang_codes}

        # 按 sys_languages 的順序排列
        result = []
        for code in active_langs:
            lc = lang_map.get(code)
            if lc:
                result.append({
                    "code": code,
                    "cname": lc.code_name.get("zh-TW", "") if isinstance(lc.code_name, dict) else "",
                    "ename": lc.code_name.get("en", "") if isinstance(lc.code_name, dict) else "",
                    "short_name": lc.note1 or code,
                })

        return result

    @staticmethod
    def sync_translation_keys(db: Session, base_lang: str = "en") -> Dict:
        """
        語系翻譯 key 同步補足

        1. 讀取所有啟用語系的翻譯檔（locale files）
        2. 取得所有 key 的聯集
        3. 補足各語系缺少的 key：
           - zh-CN: 從 zh-TW 透過 opencc 繁簡轉換
           - 其他語系: 從 base_lang(en) 複製
        4. 寫回翻譯檔 + 同步到資料庫 sys_languages.lang_data

        Returns:
            同步結果 {lang_code: {added: n, total: n}}
        """
        locales_dir = _get_locales_dir()
        results = {}

        # 取得啟用的語系列表
        profile = db.query(SysProfile).filter(SysProfile.id == 1).first()
        if not profile or not profile.sys_languages:
            return {"error": "No sys_languages configured"}

        active_langs = profile.sys_languages

        # 讀取所有語系翻譯檔
        all_translations: Dict[str, dict] = {}
        for lang_code in active_langs:
            lang_file = locales_dir / lang_code / "translation.json"
            if lang_file.exists():
                with open(lang_file, 'r', encoding='utf-8') as f:
                    all_translations[lang_code] = json.load(f)
            else:
                all_translations[lang_code] = {}

        if not all_translations:
            return {"error": "No translation files found"}

        # 遞迴取得所有 key（扁平化）
        def flatten_keys(obj, prefix=''):
            keys = set()
            if isinstance(obj, dict):
                for k, v in obj.items():
                    full_key = f"{prefix}.{k}" if prefix else k
                    if isinstance(v, dict):
                        keys.update(flatten_keys(v, full_key))
                    else:
                        keys.add(full_key)
            return keys

        # 遞迴取值
        def get_nested(obj, key_path):
            keys = key_path.split('.')
            current = obj
            for k in keys:
                if isinstance(current, dict) and k in current:
                    current = current[k]
                else:
                    return None
            return current

        # 遞迴設值
        def set_nested(obj, key_path, value):
            keys = key_path.split('.')
            current = obj
            for k in keys[:-1]:
                if k not in current:
                    current[k] = {}
                current = current[k]
            current[keys[-1]] = value

        # 取得所有語系的 key 聯集
        all_keys = set()
        for lang_data in all_translations.values():
            all_keys.update(flatten_keys(lang_data))

        # 嘗試載入 opencc（用於繁簡轉換）
        opencc_converter = None
        try:
            import opencc
            opencc_converter = opencc.OpenCC('t2s')
        except ImportError:
            logger.warning("opencc not installed, zh-CN will copy from base language")

        # 補足各語系缺少的 key
        for lang_code in active_langs:
            added = 0
            lang_data = all_translations.get(lang_code, {})
            lang_keys = flatten_keys(lang_data)
            missing_keys = all_keys - lang_keys

            for key in sorted(missing_keys):
                source_value = None

                if lang_code == 'zh-CN' and 'zh-TW' in all_translations:
                    # zh-CN: 從 zh-TW 繁簡轉換
                    source_value = get_nested(all_translations['zh-TW'], key)
                    if isinstance(source_value, str) and opencc_converter:
                        source_value = opencc_converter.convert(source_value)
                elif lang_code == 'zh-TW' and 'zh-CN' in all_translations:
                    # zh-TW: 從 zh-CN 簡繁轉換
                    source_value = get_nested(all_translations['zh-CN'], key)
                    if isinstance(source_value, str):
                        try:
                            import opencc as oc
                            source_value = oc.OpenCC('s2t').convert(source_value)
                        except ImportError:
                            pass
                else:
                    # 其他語系: 從 base_lang 複製
                    source_value = get_nested(all_translations.get(base_lang, {}), key)

                # 如果來源也沒有，從任何有值的語系複製
                if source_value is None:
                    for other_lang, other_data in all_translations.items():
                        if other_lang != lang_code:
                            source_value = get_nested(other_data, key)
                            if source_value is not None:
                                break

                if source_value is not None:
                    set_nested(lang_data, key, source_value)
                    added += 1

            all_translations[lang_code] = lang_data
            results[lang_code] = {
                "added": added,
                "total": len(flatten_keys(lang_data))
            }

        # 寫回翻譯檔 + 同步到資料庫
        for lang_code in active_langs:
            lang_data = all_translations.get(lang_code, {})

            # 寫回檔案
            lang_dir = locales_dir / lang_code
            lang_dir.mkdir(parents=True, exist_ok=True)
            lang_file = lang_dir / "translation.json"
            with open(lang_file, 'w', encoding='utf-8') as f:
                json.dump(lang_data, f, ensure_ascii=False, indent=2)

            # 同步到資料庫
            lang_record = db.query(SysLanguage).filter(
                SysLanguage.lang_code == lang_code
            ).first()
            if lang_record:
                lang_record.lang_data = lang_data

        db.commit()
        logger.info(f"Translation keys synced: {results}")
        return results
