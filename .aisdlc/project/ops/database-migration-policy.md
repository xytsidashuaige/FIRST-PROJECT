---
name: database-migration-policy
description: 数据库迁移与版本管理策略
metadata:
  type: ops
  owner: Database/Backend Team
  version: "1.0.0"
  source: Lensmor Monitor v1.0.0
  date_created: "2026-06-17"
---

# 数据库迁移与版本管理策略

> **标准依据**：Lensmor Monitor v1.0.0 实装  
> **约定级别**：所有后续项目应遵循

---

## 1. 迁移文件组织

### 1.1 目录结构

```
backend/db/
├── migrations/              # 向前迁移
│   ├── 001_init_schema.sql
│   ├── 002_add_user_table.sql
│   └── 003_add_indexes.sql
├── rollback/                # 向下迁移（可选）
│   ├── 001_revert_schema.sql
│   └── ...
└── seeds/                   # 测试数据
    ├── dev_seed.sql
    └── prod_init_competitors.sql
```

### 1.2 文件命名规范

**格式**：`{sequence}_{description}.sql`

**规则**：
- `{sequence}`：3 位递增数字（001, 002, ...）
- `{description}`：简洁英文，小写，使用下划线（不用连字符）
- **例**：`001_init_schema.sql`、`002_add_index_on_competitors.sql`

**禁止**：
- ❌ 日期前缀（`2026-06-17_001_...`）→ 重命名困难
- ❌ 不规则编号（`1_init.sql`、`10_...`）→ 排序混乱
- ❌ 临时后缀（`001_init_v2.sql`）→ 版本混淆

---

## 2. 迁移脚本编写规范

### 2.1 向前迁移 (Forward Migration)

**目标**：从版本 N 升级到版本 N+1

**约定**：
- 必须幂等性（可重复执行）
- 使用 `IF NOT EXISTS` / `IF EXISTS` 保护
- 包含完整注释说明意图
- 测试表 <100 行时添加初始数据

**模板**：

```sql
-- 001_init_schema.sql
-- 目的：初始化数据库核心表结构
-- 变更：创建 competitors, data_snapshots, changes, email_logs, reports 表

BEGIN;  -- 事务包装，保证原子性

-- 创建 competitors 表
CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  url VARCHAR(512) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_competitors_active ON competitors(active);

-- 初始化测试数据（仅 DEV/TEST）
INSERT INTO competitors (name, url, active) VALUES
  ('Example A', 'https://example-a.com', true),
  ('Example B', 'https://example-b.com', true)
ON CONFLICT (name) DO NOTHING;

COMMIT;

-- 验证命令（在执行后运行验证）：
-- SELECT COUNT(*) FROM competitors;  -- 应返回 >= 2
```

### 2.2 向下迁移 (Rollback)

**目标**：从版本 N 回退到版本 N-1

**约定**：
- 与向前迁移配对存在
- 必须完全逆转向前迁移的变更
- 删除表时确认数据已备份

**模板**：

```sql
-- rollback/001_revert_schema.sql
BEGIN;

-- 备份关键数据（如果需要）
-- CREATE TABLE competitors_backup AS SELECT * FROM competitors;

-- 删除表（顺序很重要，先删外键约束的表）
DROP TABLE IF EXISTS changes CASCADE;
DROP TABLE IF EXISTS data_snapshots CASCADE;
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;

COMMIT;
```

---

## 3. 版本跟踪

### 3.1 迁移历史表

**目的**：记录已执行的迁移脚本

**创建**：在第一个迁移中自动创建

```sql
-- 在 001_init_schema.sql 中
CREATE TABLE IF NOT EXISTS _migration_history (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

**维护**：

```sql
-- 每次迁移后记录
INSERT INTO _migration_history (version, description) VALUES
  ('001', 'Initial schema with 5 tables and indexes');
```

**查询当前版本**：

```sql
SELECT MAX(version) FROM _migration_history;
```

### 3.2 环境版本一致性检查

**启动时验证**：应用启动前检查 DB 版本

```javascript
// backend/scripts/check-db-version.js
const pkg = require('../package.json');
const pool = require('../src/db/pool');

async function verifyDatabaseVersion() {
  const expectedVersion = pkg.dbVersion || '001';
  const result = await pool.query(
    'SELECT version FROM _migration_history ORDER BY id DESC LIMIT 1'
  );
  
  const actualVersion = result.rows[0]?.version;
  
  if (actualVersion !== expectedVersion) {
    console.error(`[DB] Version mismatch: expected ${expectedVersion}, got ${actualVersion}`);
    process.exit(1);
  }
  
  console.log(`[DB] ✓ Database version matches (v${actualVersion})`);
}

verifyDatabaseVersion().catch(err => {
  console.error('[DB] Version check failed:', err.message);
  process.exit(1);
});
```

---

## 4. 执行迁移

### 4.1 开发环境

```bash
# 方式 1：使用初始化脚本（推荐首次初始化）
cd backend
npm run migrate

# 方式 2：手动执行（调试）
psql -U lensmor_app -d lensmor_monitor -f db/migrations/001_init_schema.sql
```

### 4.2 生产环境

**前置检查**：
- ✅ 备份现有数据库
- ✅ 在预发环境测试迁移
- ✅ 准备回滚脚本

**执行**：

```bash
# 1. 停止应用（或只读模式）
systemctl stop lensmor-backend

# 2. 备份
pg_dump -U lensmor_app lensmor_monitor > /backup/$(date +%Y%m%d_%H%M%S).sql

# 3. 执行迁移
psql -U lensmor_app -d lensmor_monitor -f db/migrations/002_next_migration.sql

# 4. 验证
psql -U lensmor_app -d lensmor_monitor -c "SELECT * FROM _migration_history ORDER BY id DESC LIMIT 1;"

# 5. 启动应用
systemctl start lensmor-backend

# 6. 监控（15 分钟）
tail -f /var/log/lensmor-backend.log
```

---

## 5. 故障场景处理

### 5.1 迁移失败（未完成）

**症状**：迁移脚本执行到一半出错

**处理**：

```bash
# 1. 查看错误日志
psql -U lensmor_app -d lensmor_monitor -c "SELECT * FROM _migration_history;"

# 2. 检查部分应用的状态
psql -U lensmor_app -d lensmor_monitor -c "\dt"  # 查看表

# 3. 使用 ROLLBACK 回滚到上一版本（如实现了向下迁移）
psql -U lensmor_app -d lensmor_monitor -f db/rollback/002_revert.sql

# 4. 重新执行迁移（修复脚本后）
psql -U lensmor_app -d lensmor_monitor -f db/migrations/002_next_migration.sql
```

### 5.2 迁移冲突（多分支开发）

**场景**：feature-1 创建 002_add_x.sql，feature-2 创建 002_add_y.sql

**解决**：

1. **重命名冲突**：feature-2 改为 003_add_y.sql
2. **变基**：基于 main 分支重新编号
3. **merge 前检查**：确认编号无重复

**预防**：
- 使用 PR 前 lint 检查（脚本编号应递增）
- 在 CI 中验证所有迁移可执行

---

## 6. 备份与恢复

### 6.1 定期备份策略

**频率**：
- 每日 1 次（深夜非高峰）
- 关键变更前手动备份

**保留策略**：
- 最近 7 天：全量备份
- 之前 30 天：周备份
- 之前：月备份

**命令**：

```bash
# 全量备份
pg_dump -U lensmor_app -Fc lensmor_monitor > /backup/db_$(date +%Y%m%d_%H%M%S).dump

# 只备份数据（不含 schema）
pg_dump -U lensmor_app -a lensmor_monitor > /backup/data_$(date +%Y%m%d_%H%M%S).sql

# 只备份 schema（不含数据）
pg_dump -U lensmor_app -s lensmor_monitor > /backup/schema_$(date +%Y%m%d_%H%M%S).sql
```

### 6.2 恢复程序

```bash
# 从备份恢复
pg_restore -U lensmor_app -d lensmor_monitor /backup/db_20260617_020000.dump

# 或使用 psql（用于 SQL 备份）
psql -U lensmor_app -d lensmor_monitor < /backup/data_20260617_020000.sql
```

**验证恢复**：

```bash
psql -U lensmor_app -d lensmor_monitor -c "SELECT COUNT(*) FROM competitors;"
psql -U lensmor_app -d lensmor_monitor -c "SELECT * FROM _migration_history ORDER BY id DESC LIMIT 3;"
```

---

## 7. Lensmor Monitor 初始化脚本

### 7.1 核心表设计

**competitors**（竞对管理）

```
id (PK)
name (UNIQUE)
url
active (BOOLEAN)
created_at
updated_at
```

**data_snapshots**（快照历史）

```
id (PK)
competitor_id (FK)
content (TEXT)
content_hash (VARCHAR)
title
screenshot (BYTEA)
collected_at (INDEX)
```

**changes**（变化检测）

```
id (PK)
competitor_id (FK)
old_value (TEXT)
new_value (TEXT)
field_name (VARCHAR)
change_type (VARCHAR: pricing|content|structure|other)
detected_at (INDEX)
```

**email_logs**（投递日志）

```
id (PK)
recipient (VARCHAR)
subject
sent_at (INDEX)
status (VARCHAR: sent|failed|bounced)
error_message
```

**reports**（日报）

```
id (PK)
report_date (UNIQUE, INDEX)
content (TEXT)
generated_at
sent_at (INDEX)
```

### 7.2 性能索引清单

```sql
CREATE INDEX idx_data_snapshots_competitor_id ON data_snapshots(competitor_id);
CREATE INDEX idx_data_snapshots_collected_at ON data_snapshots(collected_at);
CREATE INDEX idx_changes_competitor_id ON changes(competitor_id);
CREATE INDEX idx_changes_detected_at ON changes(detected_at);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);
CREATE INDEX idx_reports_report_date ON reports(report_date);
```

---

## 8. 后续风险与建议

### 8.1 已知限制

- ❌ 当前无向下迁移支持（需手动编写）
- ❌ 无自动冲突检测（多人开发需协调）
- ❌ 无分布式事务支持（单机 PostgreSQL）

### 8.2 改进计划

| 改进项 | 优先级 | 工作量 | 时机 |
|---|---|---|---|
| 迁移框架自动化（Flask-Migrate/TypeORM） | P1 | 中 | V1.1 |
| CI/CD 集成（自动验证迁移） | P1 | 小 | V1.1 |
| 灾难恢复演练流程 | P0 | 小 | 上线前 |
| 多库支持（读写分离） | P2 | 大 | V2.0 |

---

**版本**：1.0 | **更新**：2026-06-17 | **审查周期**：6 个月
