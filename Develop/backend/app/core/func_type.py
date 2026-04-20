"""
system_functions.func_type 集中控制元件

**設計原則（基底環境 vs 商業模組）**

CE（社群版基底）只定義兩種 func_type：
  1 = NODE  節點（選單資料夾）
  2 = PAGE  功能頁（有 UI）

其餘類型（例如 API 服務、背景任務）屬於商業化模組，
由各模組在安裝／啟動時呼叫 ``register_func_type()`` 動態加入。
這樣 CE 保持精簡、未接觸的商業類型也不會污染 CE 代碼。

所有查詢（Sidebar 過濾、路由、模型 CHECK）一律走 helper
（`is_menu_type` / `check_constraint_sql` / ...），因此只要註冊完成，
後續行為（CHECK 約束重建、選單過濾、module_code 規則）會自動涵蓋新類型。

編輯此檔注意事項：
1. 修改 CE 預設類型時，同步更新前端 `src/utils/funcType.ts` 對應表
2. 新商業類型改由模組自行註冊（請使用 `register_func_type()`），不要在此處加進 FUNC_TYPE_META
3. CHECK 約束會在模組啟動時由 helper 動態重建（見各模組的 `_ensure_func_type_check_synced`）
"""

import logging
from enum import IntEnum
from typing import Any, Dict, Literal, Tuple

logger = logging.getLogger(__name__)


class FuncType(IntEnum):
    """CE 基底保證存在的功能類型。商業模組註冊的類型只存在於 `FUNC_TYPE_META`。"""
    NODE = 1          # 節點（選單資料夾）
    PAGE = 2          # 功能頁（有 UI）


# ============================================================
# Metadata：每種類型的屬性
# ============================================================
#
#   shows_in_menu          是否在 Sidebar 主選單列出
#   is_leaf                是否為葉節點（沒有子項，在選單過濾時視為保留條件）
#   requires_module_code   DB CHECK 約束：module_code 欄位是否強制非空
#   edition                屬於哪個版本／模組來源（'ce' 或模組名稱，例如 'ee_scheduler'）
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
}


# ============================================================
# 註冊 API（商業模組啟動時呼叫）
# ============================================================

def register_func_type(
    value: int,
    *,
    name_zh_tw: str,
    shows_in_menu: bool,
    is_leaf: bool,
    requires_module_code: bool,
    edition: str = 'ee',
) -> None:
    """
    由商業模組在啟動／安裝流程中呼叫，向 CE 註冊新的 func_type。

    Args:
        value: 類型整數值，不得與 CE 保留的 1 / 2 衝突。
        name_zh_tw: 顯示名稱（供管理介面）。
        shows_in_menu: 是否要出現在 Sidebar。
        is_leaf: 是否為葉節點。
        requires_module_code: 是否要求 `module_code` 欄位非空（DB CHECK 約束用）。
        edition: 來源標記，建議填模組識別（例如 'ee_scheduler'）。

    Note:
        - 冪等：同一 value 重複註冊會**覆寫**既有 metadata 並 debug-log。
        - 註冊成功後，`check_constraint_sql()` / `module_code_check_sql()`
          下次呼叫就會包含該類型，商業模組自行負責重建資料庫 CHECK。
    """
    if value in (FuncType.NODE.value, FuncType.PAGE.value):
        raise ValueError(
            f"func_type={value} is reserved by CE and cannot be re-registered"
        )

    meta = {
        'name_zh_tw': name_zh_tw,
        'shows_in_menu': shows_in_menu,
        'is_leaf': is_leaf,
        'requires_module_code': requires_module_code,
        'edition': edition,
    }
    if value in FUNC_TYPE_META:
        logger.debug(
            "[func_type] overriding registration for value=%s (previous edition=%s, new=%s)",
            value, FUNC_TYPE_META[value].get('edition'), edition,
        )
    FUNC_TYPE_META[value] = meta
    logger.info(
        "[func_type] registered %s (value=%s, edition=%s, shows_in_menu=%s, is_leaf=%s, requires_module_code=%s)",
        name_zh_tw, value, edition, shows_in_menu, is_leaf, requires_module_code,
    )


# ============================================================
# Helpers
# ============================================================

def valid_types() -> Tuple[int, ...]:
    """目前支援的所有 func_type 整數值（含已註冊的商業類型）。"""
    return tuple(sorted(FUNC_TYPE_META.keys()))


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
    範例：CE only → `func_type IN (1, 2)`；註冊 3, 4 後 → `func_type IN (1, 2, 3, 4)`
    """
    values = ', '.join(str(v) for v in valid_types())
    return f"func_type IN ({values})"


def module_code_check_sql() -> str:
    """
    動態生成 module_code 搭配 func_type 的 CHECK 約束。
    - 不需 module_code 的類型：module_code IS NULL
    - 需要 module_code 的類型：module_code IS NOT NULL
    """
    need_mod = [str(k) for k, v in sorted(FUNC_TYPE_META.items())
                if v['requires_module_code']]
    no_mod = [str(k) for k, v in sorted(FUNC_TYPE_META.items())
              if not v['requires_module_code']]
    parts = []
    if no_mod:
        parts.append(f"(func_type IN ({', '.join(no_mod)}) AND module_code IS NULL)")
    if need_mod:
        parts.append(f"(func_type IN ({', '.join(need_mod)}) AND module_code IS NOT NULL)")
    return ' OR '.join(parts)
