"""
system_functions.func_type 集中控制元件

此為 CE / EE 共用的單一事實來源（Single Source of Truth）：
- 新增類型時只改 FUNC_TYPE_META 一處
- 所有邏輯分支（Sidebar 過濾、路由、模型約束）透過 helper 查詢

設計原則（見「系統設計/func_type 設計.md」）：
- func_type 的「值」驅動程式行為（非純粹分類），適合用 Helper/Enum
- 與 system_codes 的差異：system_codes 是資料驅動純顯示用，此處每種類型
  都對應獨立的 code path，所以走 Helper 才能充分利用 IDE 型別檢查與重構

編輯此檔注意事項：
1. 同步更新前端 `src/utils/funcType.ts` 對應表
2. 每次新增類型都要測試 Sidebar 菜單過濾仍正確
3. 若某類型新增時 CE 尚未具備相關功能（例如 EE 獨有的類型），
   metadata 可標示 edition='ee' 便於辨識歸屬
"""

from enum import IntEnum
from typing import Any, Dict, Tuple


class FuncType(IntEnum):
    """功能類型列舉 — 做型別安全的比對時優先使用此列舉"""
    NODE = 1          # 節點（選單資料夾）
    PAGE = 2          # 功能頁（有 UI）
    API_SERVICE = 3   # API 服務（EE Phase 4）— 以 API Key 認證、對外可呼叫
    TASK = 4          # 背景任務（EE Phase 3）— Scheduler 觸發器 in-process 呼叫


# ============================================================
# Metadata：每種類型的屬性
# ============================================================
#
#   shows_in_menu  是否在 Sidebar 主選單列出
#   is_leaf        是否為葉節點（沒有子項，在選單過濾時視為保留條件）
#   requires_module_code  DB CHECK 約束：除 NODE 外皆需 module_code
#   edition        屬於哪個版本（ce / ee）
#
FUNC_TYPE_META: Dict[int, Dict[str, Any]] = {
    FuncType.NODE.value: {
        'name_zh_tw': '節點',
        'shows_in_menu': True,
        'is_leaf': False,
        'requires_module_code': False,
        'edition': 'ce',
    },
    FuncType.PAGE.value: {
        'name_zh_tw': '功能頁',
        'shows_in_menu': True,
        'is_leaf': True,
        'requires_module_code': True,
        'edition': 'ce',
    },
    FuncType.API_SERVICE.value: {
        'name_zh_tw': 'API 服務',
        'shows_in_menu': False,
        'is_leaf': True,
        'requires_module_code': True,
        'edition': 'ee',
    },
    FuncType.TASK.value: {
        'name_zh_tw': '背景任務',
        'shows_in_menu': False,
        'is_leaf': True,
        'requires_module_code': True,
        'edition': 'ee',
    },
}


# ============================================================
# Helpers
# ============================================================

def valid_types() -> Tuple[int, ...]:
    """目前支援的所有 func_type 整數值"""
    return tuple(FUNC_TYPE_META.keys())


def is_menu_type(t: int) -> bool:
    """是否在 Sidebar 出現（選單過濾用）"""
    return FUNC_TYPE_META.get(t, {}).get('shows_in_menu', False)


def is_leaf_type(t: int) -> bool:
    """是否為葉節點（無子項就能被保留在選單樹中）"""
    return FUNC_TYPE_META.get(t, {}).get('is_leaf', False)


def is_node_type(t: int) -> bool:
    """是否為節點（selector for FuncType.NODE）"""
    return t == FuncType.NODE.value


def requires_module_code(t: int) -> bool:
    """DB CHECK 約束：該類型是否要求 module_code 欄位非空"""
    return FUNC_TYPE_META.get(t, {}).get('requires_module_code', False)


def check_constraint_sql() -> str:
    """
    動態生成 CheckConstraint 的 SQL 片段（for func_type 值域）
    範例輸出：`func_type IN (1, 2, 3, 4)`
    """
    values = ', '.join(str(v) for v in valid_types())
    return f"func_type IN ({values})"


def module_code_check_sql() -> str:
    """
    動態生成 module_code 搭配 func_type 的 CHECK 約束。
    - 不需 module_code 的類型：module_code IS NULL
    - 需要 module_code 的類型：module_code IS NOT NULL
    """
    need_mod = [str(k) for k, v in FUNC_TYPE_META.items() if v['requires_module_code']]
    no_mod = [str(k) for k, v in FUNC_TYPE_META.items() if not v['requires_module_code']]
    parts = []
    if no_mod:
        parts.append(f"(func_type IN ({', '.join(no_mod)}) AND module_code IS NULL)")
    if need_mod:
        parts.append(f"(func_type IN ({', '.join(need_mod)}) AND module_code IS NOT NULL)")
    return ' OR '.join(parts)
