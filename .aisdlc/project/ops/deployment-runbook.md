---
name: deployment-runbook
description: Lensmor Monitor 部署与运维完整手册（生产环境）
metadata:
  type: ops
  owner: DevOps Team
  version: "1.0.0"
  source: Spec Pack 001-competitor-monitoring
  date_created: "2026-06-17"
---

# Lensmor Monitor 部署与运维完整手册

> **文档来源**：Spec Pack `001-competitor-monitoring` 验收完成（V1.0.0）  
> **准出状态**：✅ 已验证（20/20 用例通过）  
> **环境**：生产/预发环境  

---

## 1. 前置条件与环境要求

### 1.1 系统要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | v18+ LTS | 后端/前端运行时 |
| PostgreSQL | 12+ | 数据库 |
| Git | 任意 | 代码管理 |
| SendGrid API / SMTP | 任意 | 邮件投递 |

### 1.2 网络与权限

- **后端服务**：需暴露 3001 端口（可通过反向代理隐藏）
- **前端**：需暴露 3000 端口或通过 CDN 分发
- **数据库**：PostgreSQL 5432 端口（生产应使用内网 IP）
- **邮件服务**：需出方向网络访问（SendGrid 或内网 SMTP）

---

## 2. 数据库初始化

### 2.1 创建数据库与用户

```bash
# 以 PostgreSQL 超级用户身份执行
psql -U postgres

# 在 psql 中执行
CREATE DATABASE lensmor_monitor ENCODING 'UTF8';
CREATE USER lensmor_app WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE lensmor_monitor TO lensmor_app;
```

### 2.2 执行迁移脚本

数据库初始化脚本位置：`backend/db/migrations/001_init_schema.sql`

**脚本内容** ✅ 已验证包含：
- `competitors` 表（竞对列表）
- `data_snapshots` 表（数据快照）
- `changes` 表（变化检测）
- `email_logs` 表（邮件日志）
- `reports` 表（日报记录）
- 5 个性能索引（优化查询性能）
- 测试数据初始化（3 个示例竞对）

**执行迁移**：

```bash
# 方式 1：使用 Node.js 初始化脚本
cd backend
npm install
DATABASE_URL="postgresql://lensmor_app:password@localhost:5432/lensmor_monitor" npm run migrate

# 方式 2：直接使用 psql
psql -U lensmor_app -d lensmor_monitor -f db/migrations/001_init_schema.sql
```

**验证迁移成功**：

```sql
-- 连接到 lensmor_monitor 数据库后执行
\dt  -- 列出所有表，应显示 5 个表
SELECT COUNT(*) FROM competitors;  -- 应返回 3
```

---

## 3. 环境变量配置

### 3.1 后端 `.env` 模板

```
# ============ 数据库 ============
DATABASE_URL=postgresql://lensmor_app:password@db.example.com:5432/lensmor_monitor

# ============ 邮件投递（二选一）============

# 选项 A：SendGrid（推荐，生产环境）
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@lensmor.com

# 选项 B：Nodemailer + SMTP（备选）
EMAIL_PROVIDER=nodemailer
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASS=your_smtp_password

# ============ 日报投递 ============
REPORT_RECIPIENTS=team@example.com,manager@example.com

# ============ 应用配置 ============
PORT=3001
NODE_ENV=production

# ============ 日志级别 ============
LOG_LEVEL=info
```

### 3.2 前端 `.env` 模板

```
REACT_APP_API_URL=http://api.example.com/api
REACT_APP_ENV=production
```

---

## 4. 部署步骤（蓝绿部署）

### 4.1 推荐：蓝绿部署（零停机）

**前置**：准备两套完整的应用实例（蓝/绿）

1. **准备绿环境**（新版本）
   ```bash
   git clone <repo> lensmor-green
   cd lensmor-green/backend
   npm install --production
   npm start &
   ```

2. **验证绿环境**
   ```bash
   curl http://localhost:3001/health
   ```

3. **切换流量**（通过 Nginx）
   ```bash
   upstream_backend 10.0.1.2:3001;  # 新地址
   nginx -s reload
   ```

4. **监控（15-30 分钟）**
   - 观察错误率、响应时间
   - 如无异常，部署完成

---

## 5. 定时任务配置

系统启动时自动注册以下 cron 任务：

| 任务 | 时间 | 成功率目标 |
|---|---|---|
| 数据采集 | 每天 02:00 | > 95% |
| 变化检测 | 每天 02:30 | > 95% |
| 日报生成 | 每天 08:00 | > 99% |

---

## 6. 监控关键指标

| 指标 | 目标 | 告警阈值 |
|---|---|---|
| API 响应时间 (P95) | < 200ms | > 500ms |
| 采集成功率 | > 95% | < 90% |
| 邮件投递成功率 | > 99% | < 95% |
| 系统可用性 | >= 99% | < 99% |

---

## 7. 快速回滚

```bash
# 修改负载均衡器指向蓝环境
sed -i "s|upstream_backend .*;|upstream_backend 10.0.1.1:3001;|" /etc/nginx/nginx.conf
nginx -s reload

# 验证
curl http://api.example.com/health
```

---

## 8. 故障排查

**问题**：后端无法连接数据库

```bash
# 检查 DATABASE_URL
env | grep DATABASE_URL

# 测试连接
psql -h db.example.com -U lensmor_app -d lensmor_monitor -c "SELECT 1"
```

**问题**：邮件发送失败

```bash
# 检查 SENDGRID_API_KEY
env | grep SENDGRID_API_KEY

# 测试 API
curl -X GET "https://api.sendgrid.com/v3/mail/send" \
  -H "Authorization: Bearer $SENDGRID_API_KEY"
```

---

## 9. 后续验证项（风险清单）

- ⏳ **真实 PostgreSQL 集成测试**（当前为单元测试）
- ⏳ **100+ 竞对并发采集性能测试**（当前测试 3 竞对）
- ⏳ **生产邮件投递验证**（SendGrid/SMTP）
- ⏳ **灾难恢复演练**（数据库备份/恢复）
- ⏳ **安全渗透测试**（OWASP Top 10）

---

**版本**：1.0 | **更新**：2026-06-17 | **审查**：2026-09-17
