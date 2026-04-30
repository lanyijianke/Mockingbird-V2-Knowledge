# SQLite → MySQL 迁移设计

> 日期：2026-04-30
> 状态：待审核

## 目标

将 Mockingbird Knowledge Web 的数据库从 SQLite（better-sqlite3）迁移到 MySQL（mysql2），使用已有的 `mockingbird_knowledge` 数据库（utf8mb4）。

## 方案：直接替换 db 层

保持现有 `query/execute` 辅助函数接口风格，只替换底层实现。所有业务逻辑和 SQL 结构不变，仅适配语法差异。

## 一、连接层 (`lib/db.ts`)

- **驱动**：`mysql2/promise`
- **连接方式**：`createPool()`，默认 10 连接
- **环境变量**：`MYSQL_URL=mysql://user:pass@host:3306/mockingbird_knowledge`
- **接口变化**：所有操作从同步改为异步

```typescript
// 改造后的核心接口
await query<T>(sql, params)    // 返回 [rows, fields]
await queryOne<T>(sql, params) // 返回单行或 undefined
await queryScalar<T>(sql, params) // 返回标量值
await execute(sql, params)     // 执行写操作
await transaction(fn)          // 异步事务封装
await closePool()              // 关闭连接池
```

## 二、SQL 语法适配 (`lib/init-schema.ts`)

| SQLite | MySQL |
|--------|-------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `INT PRIMARY KEY AUTO_INCREMENT` |
| `DEFAULT (lower(hex(randomblob(16))))` | 应用层用 `crypto.randomUUID()` 生成 |
| `DEFAULT (datetime('now'))` | `DEFAULT NOW()` |
| `PRAGMA table_info()` | `INFORMATION_SCHEMA.COLUMNS` 查询 |
| `datetime('now', '-' \|\| ? \|\| ' days')` | `DATE_SUB(NOW(), INTERVAL ? DAY)` |

### Schema 初始化策略

保留启动时自动建表模式（`CREATE TABLE IF NOT EXISTS`）。列存在性检查从 `PRAGMA table_info()` 改为查 `INFORMATION_SCHEMA.COLUMNS`。

### Users 表 Id 生成

从 `lower(hex(randomblob(16)))` 改为应用层 `crypto.randomUUID()`，INSERT 时由代码传入。

## 三、路由层适配

约 20 个文件需要将同步 db 调用改为 `await` 异步调用。改动模式机械统一：

```typescript
// 之前
const user = queryOne<User>('SELECT ...', [email]);

// 之后
const [user] = await queryOne<User>('SELECT ...', [email]);
```

### 涉及文件

**认证路由：**
- `app/api/auth/login/route.ts`
- `app/api/auth/register/route.ts`
- `app/api/auth/me/route.ts`
- `app/api/auth/verify-email/route.ts`
- `app/api/auth/forgot-password/route.ts`
- `app/api/auth/reset-password/route.ts`
- `app/api/auth/helpers.ts`

**会员：**
- `app/api/membership/redeem/route.ts`

**学社：**
- `app/api/academy/content/route.ts`
- `app/api/academy/content/[slug]/route.ts`

**其他：**
- `app/api/health/route.ts`
- `lib/auth/session.ts`
- `lib/auth/require-role.ts`
- `lib/services/prompt-service.ts`
- `lib/services/log-service.ts`
- `lib/pipelines/prompt-sources/remote-sync.ts`

### 事务处理

```typescript
// 之前（SQLite 同步事务）
db.transaction(() => { execute(...); execute(...); });

// 之后（MySQL 异步事务）
await transaction(async (conn) => {
    await conn.execute(...);
    await conn.execute(...);
});
```

## 四、脚本适配

- `scripts/generate-invite-codes.mjs` — 改用 mysql2 连接
- `scripts/gen-invite.ts` — 同上
- 新增 `scripts/migrate-sqlite-to-mysql.ts` — 一次性数据迁移脚本

### 迁移脚本逻辑

1. 连接 SQLite 读取各表数据
2. 按外键依赖顺序插入 MySQL：Users → Sessions → OauthAccounts → EmailVerificationTokens → PasswordResetTokens → Prompts → SystemLogs → InvitationCodes → InvitationRedemptions → AcademyContent
3. 批量 INSERT（每批 500 行）
4. 完成后对比各表行数校验

## 五、测试适配

4 个测试文件从 SQLite 内存数据库改为使用真实 MySQL 测试库：

- `tests/init-schema.test.ts`
- `tests/unit/init-schema-prompt-preview.test.ts`
- `tests/unit/auth-routes.test.ts`
- `tests/unit/membership-redeem-route.test.ts`

每个测试文件使用独立的 `MYSQL_URL` 环境变量，测试前清空表，测试后也清空。

## 六、清理

- `package.json`：移除 `better-sqlite3`、`@types/better-sqlite3`，新增 `mysql2`
- `.env.example`：`SQLITE_DB_PATH` → `MYSQL_URL`
- `.gitignore`：移除 `/data/`、`db_backups/` 相关条目
- `CLAUDE.md`：更新数据库相关文档

## 改动量汇总

| 模块 | 文件数 | 改动性质 |
|------|--------|----------|
| `lib/db.ts` | 1 | 重写连接层 |
| `lib/init-schema.ts` | 1 | SQL 语法适配 |
| 路由层 + services + auth | ~16 | 加 `await`，接口适配 |
| 脚本 | 3 | 2 个适配 + 1 个新增迁移脚本 |
| 测试 | 4 | 改用 MySQL |
| 配置 | 3 | env、gitignore、CLAUDE.md |

总计约 **28 个文件**。
