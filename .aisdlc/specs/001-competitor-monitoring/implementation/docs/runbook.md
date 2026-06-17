# Lensmor Monitor 运维手册

## 1. 系统部署

### 1.1 前置条件

- Node.js LTS 版本 (v18+)
- PostgreSQL 12+
- Git

### 1.2 环境变量配置

创建 `.env` 文件（后端根目录）：

```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/lensmor_monitor

# 前端 API 地址
REACT_APP_API_URL=http://localhost:3001/api

# 邮件投递配置
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@lensmor.com
REPORT_RECIPIENTS=team@example.com,manager@example.com

# 或使用 Nodemailer + SMTP
# EMAIL_PROVIDER=nodemailer
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_SECURE=true
# SMTP_USER=user@example.com
# SMTP_PASS=password
# SMTP_FROM_EMAIL=noreply@example.com

# 服务端口
PORT=3001
```

### 1.3 数据库初始化

```bash
# 创建数据库
createdb lensmor_monitor

# 执行迁移脚本
psql -U <user> -d lensmor_monitor -f backend/db/migrations/001_init_schema.sql
```

### 1.4 安装依赖与启动

```bash
# 后端
cd backend
npm install
npm start

# 前端（新终端）
cd frontend
npm install
npm start
```

服务将在以下地址运行：
- 后端 API：http://localhost:3001/api
- 前端：http://localhost:3000

---

## 2. 定时任务配置

系统自动注册以下定时任务（启动时初始化）：

| 任务 | 时间 | 描述 |
|---|---|---|
| 数据采集 | 每天 02:00 | 采集所有在线竞对数据 |
| 变化检测 | 每天 02:30 | 检测数据变化并记录 |
| 日报生成与投递 | 每天 08:00 | 生成前一天日报并发送邮件 |

### 2.1 日志查看

后端控制台输出任务执行日志：

```
[COLLECT] Starting data collection task at 2026-06-17T02:00:00.000Z
[COLLECT] Task completed: 3/3 competitors collected (100% success rate)
[DETECT] Change detection task started...
[REPORT] Report generation and email send task started...
[REPORT] Task completed: Report generated and sent to 2 recipients (100% success rate)
```

### 2.2 手动触发任务

虽然任务自动调度，但可通过直接调用服务来测试：

```bash
# 测试采集
curl -X GET http://localhost:3001/api/collectors/test

# 测试变化检测
curl -X GET http://localhost:3001/api/detectors/test

# 测试日报生成
curl -X GET http://localhost:3001/api/reporters/test
```

---

## 3. 监控告警

### 3.1 关键指标

监控以下指标以检测系统异常：

| 指标 | 正常范围 | 告警阈值 | 备注 |
|---|---|---|---|
| 采集成功率 | > 95% | < 90% | 7 天滑动平均 |
| 邮件投递成功率 | > 99% | < 95% | 30 天滑动平均 |
| API 响应时间（P95） | < 200ms | > 500ms | 每分钟采样 |
| 数据库连接数 | < 50 | > 80 | 实时监控 |
| 定时任务执行时长 | < 5min | > 10min | 记录每次执行 |

### 3.2 错误日志检查

```bash
# 查看后端错误
tail -f backend/logs/error.log

# 查看数据库连接异常
grep -i "connection" backend/logs/error.log
```

### 3.3 告警规则示例

对接监控平台（如 Prometheus、Grafana）：

```yaml
- alert: CompetitorCollectionFailure
  expr: collector_success_rate < 0.9
  for: 10m
  annotations:
    summary: "Competitor data collection success rate dropped below 90%"

- alert: EmailDeliveryFailure
  expr: email_delivery_success_rate < 0.95
  for: 5m
  annotations:
    summary: "Email delivery success rate dropped below 95%"

- alert: APIResponseTimeHigh
  expr: api_response_time_p95 > 500
  for: 5m
  annotations:
    summary: "API P95 response time exceeded 500ms"
```

---

## 4. 故障处理

### 4.1 采集失败

**症状**：采集任务执行但成功率 < 95%

**排查步骤**：

1. 检查网络连接：`ping <competitor-url>`
2. 检查防火墙规则（是否允许出站 HTTPS）
3. 查看采集日志，识别失败的竞对
4. 检查该竞对是否有反爬机制（验证码、拉黑）
5. 尝试增加重试次数或延迟：修改 `collector.js` 中的 `retries` 和 `retryDelay`

**恢复**：

```bash
# 重新启动后端服务
npm restart

# 如果问题持久，禁用该竞对并标记为人工审核
UPDATE competitors SET active = false WHERE id = <problematic-competitor-id>;
```

### 4.2 邮件投递失败

**症状**：报告生成但未收到邮件

**排查步骤**：

1. 检查 SENDGRID_API_KEY 是否设置正确
2. 查看邮件投递日志
3. 检查收件人邮箱是否正确、是否在垃圾箱
4. 查询数据库中 reports 表的 sent_at 字段是否为 NULL

```sql
SELECT report_date, sent_at FROM reports WHERE sent_at IS NULL LIMIT 5;
```

**恢复**：

```bash
# 手动重发某日期的报告
curl -X POST http://localhost:3001/api/reports/resend -d '{"report_date": "2026-06-17"}'
```

### 4.3 数据库连接超时

**症状**：API 返回 "Connection timeout" 错误

**排查步骤**：

1. 检查数据库是否运行：`psql -c "SELECT 1"`
2. 检查连接池配置，增加最大连接数

```javascript
// 在 backend/src/index.js 中修改
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // 从默认 10 增加到 20
  idleTimeoutMillis: 30000,
});
```

3. 检查是否有大量并发请求，导致连接耗尽

**恢复**：重启后端服务

---

## 5. 性能优化

### 5.1 慢查询优化

如果竞对列表查询变慢：

```sql
-- 检查索引是否存在
EXPLAIN ANALYZE SELECT * FROM competitors WHERE active = true;

-- 如果使用 SEQUENTIAL SCAN，添加索引
CREATE INDEX idx_competitors_active ON competitors(active);
```

### 5.2 缓存策略

考虑为常访问的日报添加缓存：

```javascript
// 在 backend/src/routes/reports.js 中添加缓存
const cache = new Map();

router.get('/:date', (req, res) => {
  const cached = cache.get(req.params.date);
  if (cached) {
    return res.json(cached);
  }
  // ... 查询数据库
  cache.set(req.params.date, result);
  // 1 小时后自动失效
  setTimeout(() => cache.delete(req.params.date), 3600000);
});
```

### 5.3 采集并发优化

如果竞对数量 > 20，增加采集并发：

```javascript
// 在 backend/src/services/collector.js 中修改
async collectAll() {
  // 使用 Promise.all 并行采集（而非顺序）
  const results = await Promise.all(competitors.map(c => this.scraper.scrapePage(c.url)));
}
```

---

## 6. 扩容建议

### 6.1 单机 MVP 配置

- 竞对数量：< 50
- 日均采集量：< 100
- 日均用户：< 100
- 存储：< 10 GB

**配置**：
- 单台服务器（2 核 4GB）
- PostgreSQL 数据库（本地或云服务）
- Cron 定时任务

### 6.2 扩容方案（竞对 > 50）

**添加缓存层**：

- Redis 缓存日报与竞对列表
- 配置：1 核 1GB Redis 实例

**分离采集任务**：

- 独立采集 Worker 进程（可多进程/多机）
- 使用消息队列（RabbitMQ/Kafka）解耦采集与检测

**数据库优化**：

- 升级 PostgreSQL 规格
- 添加读副本用于报告查询
- 定期清理历史快照数据

```sql
-- 清理超过 90 天的快照
DELETE FROM data_snapshots 
WHERE collected_at < NOW() - INTERVAL '90 days';
```

---

## 7. 备份与恢复

### 7.1 数据库备份

```bash
# 全量备份
pg_dump lensmor_monitor > backup_$(date +%Y%m%d_%H%M%S).sql

# 增量备份（WAL 归档）
# 在 postgresql.conf 中配置
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal_archive/%f'
```

### 7.2 恢复

```bash
# 从备份恢复
psql lensmor_monitor < backup_20260617_100000.sql
```

---

## 8. 发布/回滚

### 8.1 蓝绿部署

```bash
# 部署新版本到 "绿" 环境
git checkout release-v1.1.0
npm install
npm run build

# 执行迁移
npm run migrate

# 切换流量
# 使用负载均衡器或 DNS 指向新环境

# 旧环境待命作为回滚目标
```

### 8.2 回滚步骤

```bash
# 1. 切换流量回旧环境
# 2. 验证旧环境正常
# 3. 如需数据库回滚
git checkout release-v1.0.0
npm run migrate:down
```

---

## 9. 常见问题

### Q: 采集的数据存在多少天？

A: 默认保留 90 天历史数据。可通过修改清理策略调整。

### Q: 能否自定义采集时间？

A: 目前采集时间固定为每天 02:00。如需修改，编辑 `backend/src/tasks/collectSnapshot.js` 中的 cron 表达式。

### Q: 如何添加新竞对？

A: 通过前端页面新增或 API：

```bash
curl -X POST http://localhost:3001/api/competitors \
  -H "Content-Type: application/json" \
  -d '{"name":"NewCompetitor","url":"https://example.com"}'
```

### Q: 日报何时发送？

A: 每天 08:00 发送前一天的日报（需前一天有采集数据）。

---

## 支持与反馈

如有问题，请联系平台管理员或提交 Issue。

---

*最后更新：2026-06-17*
