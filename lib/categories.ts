import categoriesConfig from '@/config/categories.json';

// ════════════════════════════════════════════════════════════════
// 分类系统 — 从 JSON 配置文件加载，替代数据库 Categories 表
// ════════════════════════════════════════════════════════════════

export interface CategoryItem {
    code: string;
    name: string;
}

export interface CategoryGroup {
    code: string;
    name: string;
    children: CategoryItem[];
}

export interface CategoriesConfig {
    groups: CategoryGroup[];
}

// ── 加载配置 ──────────────────────────────────────────────────
const config: CategoriesConfig = categoriesConfig as CategoriesConfig;

/** 全部分组 */
export const CATEGORY_GROUPS: CategoryGroup[] = config.groups;

/** 全部子类的扁平字典 code → name */
const flatMap = new Map<string, string>();
for (const group of config.groups) {
    flatMap.set(group.code, group.name);
    for (const child of group.children) {
        flatMap.set(child.code, child.name);
    }
}

/** 根据 code 获取中文显示名 */
export function getCategoryName(code: string | null | undefined): string {
    if (!code) return '未分类';
    return flatMap.get(code) ?? code;
}

/** 获取指定分组的子类列表 */
export function getSubcategories(groupCode: string): CategoryItem[] {
    return config.groups.find(g => g.code === groupCode)?.children ?? [];
}

/** 获取全部有效分类编码（含顶级和子级） */
export function getAllCategoryCodes(): string[] {
    return Array.from(flatMap.keys());
}
