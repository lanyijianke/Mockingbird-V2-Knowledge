# 知识库前端分类适配设计

> 本文档定义知识库前端如何适配后端 IntelligenceTagging 从平面 Tags 到结构化 Domain/CategoryPath/KeywordsJson 的变化。

---

## 背景

后端正在进行分类分层重构（见 Mockingbird_V2 的 taxonomy 设计文档），核心变化：

- `IntelligenceTagging.Tags`（逗号分隔字符串）→ `Domain` + `CategoryPath` + `KeywordsJson`
- `Domain`：顶层领域，固定为 `AI` | `Finance` | `Global`
- `CategoryPath`：完整层级路径，例如 `Finance/Web3/DeFi`、`AI/Model/Agent`
- `KeywordsJson`：JSON 数组，只放横向关键词（实体名、产品名、技术术语）
- 后端提供 `ClassificationTaxonomyHelper.ToLegacyTags()` 兼容派生，前端过渡期可继续使用 `Tags`

## 目标

1. 前端筛选、展示、统计全部从结构化字段读取，不再依赖 `Tags.split(',')`
2. 分类筛选从硬编码 4 个 tab 改为数据驱动的两级联动
3. 卡片标签展示从平面平铺改为"面包屑路径 + 关键词 chips"的分层结构
4. CSS 颜色系统从 3 个硬编码分类扩展为按 Domain 着色的动态方案

## 非目标

1. 不改后端的分类逻辑或数据库结构
2. 不在这一轮引入前端分类树管理界面
3. 不改 narrative 的 Phase 体系（Emerging/Rising/Peak/Cooling 不受影响）

---

## 设计决策

### 1. 筛选器：两级联动

**现状**：硬编码 `all / AI / Web3 / Finance` 四个 tab，用 `Tags.includes()` 或 `Category === tab` 匹配。

**改后**：

- 一级筛选：`全部 / AI / Finance / Global`，按 `Domain` 字段过滤
- 二级筛选：选中某个 Domain 后，展开其子分类（从数据的 `CategoryPath` 动态提取），例如选 Finance 后展开 `Web3 / Traditional`
- 二级选项不硬编码，从实际数据的 `CategoryPath` 中动态聚合，后端 API 返回可用的子分类列表即可

**迁移兼容**：前端仍保留 `"Web3"` 作为 Finance 下的子分类选项，后端的 `NormalizeCategoryFilter("Web3") → "Finance/Web3"` 兼容逻辑确保旧链接/旧参数不 404。

### 2. 卡片标签：面包屑 + 关键词

**现状**：`item.tags.slice(0, 3)` 或 `.slice(0, 4)` 平铺显示，所有标签同一颜色，无法区分分类和关键词。

**改后**：

```
[Domain] / [子分类] / [叶子分类]  |  [关键词1] [关键词2] [关键词3]
```

- **面包屑部分**：用 `/` 分隔，颜色随 Domain（AI 蓝、Finance 绿、Global 金），从深到浅渐变表示层级
- **关键词部分**：用浅灰色小 chips，视觉上与分类路径区隔
- 数量限制：面包屑最多 3 层，关键词最多 4 个

### 3. 颜色系统

按 Domain 着色，替换现有的按 `web3/ai/finance` 着色：

| Domain | 主色 | 背景 |
|--------|------|------|
| AI | `#3b82f6` (蓝) | `rgba(59,130,246,0.12)` |
| Finance | `#22c55e` (绿) | `rgba(34,197,94,0.12)` |
| Global | `#fbbf24` (金) | `rgba(251,191,36,0.12)` |
| 默认/其他 | `#888` (灰) | `rgba(100,100,120,0.1)` |

子分类标签继承 Domain 色系但降低透明度，关键词统一用灰色。

### 4. API 层改造

每个 API 路由需要：

1. SQL 查询从读 `Tags` 改为读 `Domain`、`CategoryPath`、`KeywordsJson`
2. 过滤逻辑从 `Tags LIKE '%Web3%'` 改为基于 `Domain` 和 `CategoryPath` 的结构化过滤
3. 返回结构增加 `domain`、`categoryPath`、`keywords` 字段，保留 `tags` 作为兼容字段
4. 分类筛选参数从 `tags` 改为 `domain` + `category`（向后兼容旧的 `tags` 参数）

---

## 受影响文件清单

### API 路由（高优先级）

| 文件 | 变更内容 |
|------|---------|
| `app/api/academy/quicknews/route.ts` | 改 SQL 读结构化字段，改过滤逻辑，改返回结构 |
| `app/api/academy/articles/route.ts` | 同上 |
| `app/api/academy/narratives/route.ts` | Category 来源可能变化，需确认 |
| `app/api/academy/reports/route.ts` | 同上 |

### 前端页面（高优先级）

| 文件 | 变更内容 |
|------|---------|
| `app/academy/quicknews/page.tsx` | 改接口定义、筛选器、标签展示、删除 `categoryFromTags`/`inferCategory` |
| `app/academy/articles/page.tsx` | 改接口定义、筛选器、标签展示、改 `tagStyle()` 函数 |
| `app/academy/narratives/page.tsx` | 改接口定义、筛选器、Category badge → 面包屑 |
| `app/academy/reports/page.tsx` | 改接口定义、筛选器、Category badge |
| `app/intel/page.tsx` | 改接口定义、标签展示、叙事面板 Category badge |

### CSS 样式（中优先级）

| 文件 | 变更内容 |
|------|---------|
| `app/_styles/intel-main.css` | 改分类颜色变量，新增面包屑样式 |
| `app/academy/quicknews/quicknews.css` | 改标签 chip 样式 |
| `app/academy/articles/articles.css` | 改标签 chip 样式 |
| `app/academy/narratives/narratives.css` | 改分类 badge 为面包屑样式 |
| `app/academy/reports/reports.css` | 改分类 badge |

### 无需改动

| 文件 | 原因 |
|------|------|
| `lib/categories.ts` / `config/categories.json` | 用于文章（本地 markdown）分类，与情报分类无关 |
| `lib/types.ts` 的 `ArticleCategory` | 同上，用于学社本地文章 |

---

## 迁移策略

### 阶段一：兼容运行（后端先行，前端不动）

后端重构上线后，DTO 继续返回 `Tags` 兼容字段（由 `ToLegacyTags()` 派生），前端无需任何改动即可正常运行。

### 阶段二：前端适配（本文档的实施范围）

1. 先改 API 路由：SQL 读结构化字段，返回新格式
2. 再改前端页面：接口定义、筛选器、标签展示
3. 最后清理：删除 `categoryFromTags`、`inferCategory`、硬编码 tab 等临时逻辑

### 阶段三：后续优化（不在本轮）

- 动态分类树从后端 API 获取，而非从数据中聚合
- 分类统计页面
- 前端分类管理界面

---

## 验收标准

1. 学社四个子页面（信息流/文章/叙事/研报）的筛选器从 `Domain` 动态渲染，不再硬编码
2. 所有卡片标签展示为"面包屑路径 + 关键词 chips"的分层结构
3. API 路由不再使用 `Tags.split(',')`，改用结构化字段
4. 旧 URL 参数 `?tags=Web3` 仍然有效（兼容重定向）
5. CSS 颜色按 Domain 着色，支持 AI/Finance/Global 三个域

---

## 风险

1. **后端部署时序**：如果后端先上线但还没跑历史数据回填，新的 `Domain`/`CategoryPath` 字段可能为空，API 需要处理这种情况（fallback 到旧 Tags）
2. **分类树变化**：如果后端后续在 CategoryPath 里加新的子树（比如 `Finance/Web3/NFT`），前端面包屑展示应自动适配，不需要改前端代码
3. **Narrative 的 Category**：叙事表的 `Category` 字段来源不同于 Tagging，需要确认后端是否也会同步改为结构化字段
