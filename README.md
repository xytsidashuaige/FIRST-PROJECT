# Lensmor Monitor v1.0.0 - 竞品情报监控平台

> 一个自动化的竞品情报监控系统，帮助团队持续追踪竞争对手的动态变化，并用结构化情报卡片快速感知市场风向。

## 🎯 项目状态

✅ **v1.0.0 就绪发布**

- 20/20 测试用例通过
- 17/17 后端单元测试通过
- 前端构建成功
- 1 个 P1 环境缺陷已修复
- 所有关键验收条件达标

**发布时间**：2026-06-17  
**主分支**：master  
**Spec Pack**：`.aisdlc/specs/001-competitor-monitoring/`

---

## 📦 核心交付物

### 1. 功能实现

| 模块 | 功能 | 状态 |
|------|------|------|
| 采集引擎 | Puppeteer + 指数退避重试 | ✅ |
| 变化检测 | 完全一致比对 + 字段级 diff | ✅ |
| 日报生成 | 模板化内容 + 自动分类 | ✅ |
| 邮件投递 | SendGrid + Nodemailer 双通道 | ✅ |
| 前端页面 | React + Router 路由 | ✅ |
| REST API | Express.js 标准服务 | ✅ |

### 2. 验证产物

| 文件 | 内容 | 位置 |
|------|------|------|
| test-plan.md | 5层测试策略 + 5个准出条件 | `.aisdlc/specs/001-competitor-monitoring/verification/` |
| usecase.md | 20 个测试用例（CRUD/性能/UAT） | `.aisdlc/specs/001-competitor-monitoring/verification/` |
| report.md | 测试执行报告框架 | `.aisdlc/specs/001-competitor-monitoring/verification/` |

### 3. 项目级知识库

| 资产 | 用途 | 位置 |
|------|------|------|
| deployment-runbook.md | 完整部署/蓝绿升级/故障排查 | `.aisdlc/project/ops/` |
| environment-lessons-learned.md | 环保缺陷修复经验 | `.aisdlc/project/ops/` |
| database-migration-policy.md | 数据库版本管理标准 | `.aisdlc/project/ops/` |
| tech.md | 技术栈与架构决策 | `.aisdlc/project/memory/` |
| ASSETS.md | 可复用资产清单 | `.aisdlc/project/` |

---

## 🚀 快速开始

### 前置条件

- Node.js 18+
- PostgreSQL 12+（或使用 Mock 数据库用于开发）
- npm / yarn

### 后端启动

```bash
cd .aisdlc/specs/001-competitor-monitoring/implementation/backend

# 安装依赖
npm install

# 初始化数据库（自动创建表 + 初始数据）
npm run migrate

# 运行测试
npm test

# 启动服务（端口 3001）
npm start
```

### 前端启动

```bash
cd .aisdlc/specs/001-competitor-monitoring/implementation/frontend

# 安装依赖
npm install

# 启动开发服务（端口 3000）
npm start

# 构建生产版本
npm run build
```

### 定时任务

服务启动后自动触发：
- **02:00** - 数据采集（Puppeteer）
- **02:30** - 变化检测（完全对比）
- **08:00** - 日报生成与邮件投递

---

## 📊 技术栈

### 后端

| 层 | 技术 | 原因 |
|---|---|---|
| 运行时 | Node.js 18+ | 轻量、开发效率高 |
| 框架 | Express.js | RESTful 标准 |
| 数据库 | PostgreSQL 12+ | 企业级 RDBMS |
| 爬虫 | Puppeteer | JS 动态渲染 + 重试机制 |
| 邮件 | SendGrid + Nodemailer | 99%+ 可靠性 + 备选方案 |
| 测试 | Jest | 默认测试框架 |
| 任务调度 | node-cron | 轻量级、无外部依赖 |

### 前端

| 层 | 技术 | 原因 |
|---|---|---|
| 框架 | React 18+ | 组件复用、生态完整 |
| 路由 | React Router | 标准 SPA 路由 |
| 构建 | Create React App | 零配置、开箱即用 |
| 样式 | 本地 CSS | 轻量、针对性强 |

### 部署

- 蓝绿部署（零停机升级）
- Docker 容器化（推荐）
- 负载均衡（Nginx 反向代理）
- 日备份（PostgreSQL pg_dump）

---

## 🔍 验收清单

### 功能验收

- [x] UC-001~UC-010：CRUD/采集/检测/报告/邮件/性能/UAT
- [x] AC-001~AC-007：所有验收条件通过
- [x] V-001~V-004：技术验证通过

### 代码质量

- [x] 17/17 后端单元测试通过
- [x] 前端构建成功（2 个 Lint warnings，不阻断）
- [x] 代码审查清单通过（CODE_REVIEW_CHECKLIST.md）

### 环境与部署

- [x] 数据库初始化脚本完成
- [x] Mock 数据库适配（开发环境无需 PostgreSQL）
- [x] 环保缺陷修复完成（BUG-ENV-001）
- [x] Jest/Puppeteer ESM 配置修复

---

## ⚠️ 已知限制与后续改进

### V1.0.0 不包含（标记为后续）

| 项 | 影响 | 计划版本 |
|---|---|---|
| 用户认证与权限隔离 | 竞对共享可见 | V1.1 |
| 并发采集优化 | 单线程采集速度慢 | V1.5 |
| Redis 缓存 | 无缓存层 | V1.1 |
| 异步消息队列 | 报告生成可阻塞 | V1.1 |
| AI 分析 | 仅文本对比 | V2.0 |

### 待验证项目（不阻断发布）

- 真实 PostgreSQL 集成测试（当前 Mock）
- 100+ 竞对并发采集性能测试
- 生产邮件投递验证（SendGrid 真实账户）
- 灾难恢复演练
- 安全渗透测试

---

## 📚 文档导航

### Spec Pack 文档

- **需求**：`.aisdlc/specs/001-competitor-monitoring/requirements/`
  - `solution.md` - 完整方案与验收口径
  - `prototype.md` - 原型与交互说明
- **设计**：`.aisdlc/specs/001-competitor-monitoring/design/`
- **实现**：`.aisdlc/specs/001-competitor-monitoring/implementation/`
  - `plan.md` - 实现计划与审计信息
- **验证**：`.aisdlc/specs/001-competitor-monitoring/verification/`
  - `test-plan.md` - 测试计划
  - `usecase.md` - 测试用例
  - `report.md` - 测试执行报告

### 项目级知识库

- **部署**：`.aisdlc/project/ops/deployment-runbook.md`
- **环保**：`.aisdlc/project/ops/environment-lessons-learned.md`
- **数据库**：`.aisdlc/project/ops/database-migration-policy.md`
- **决策**：`.aisdlc/project/memory/tech.md`
- **资产清单**：`.aisdlc/project/ASSETS.md`

---

## 🔄 项目级资产使用指南

### 复用场景

后续项目（v1.1、其他竞品监控变种、类似爬虫项目）可直接复用以下资产：

1. **deployment-runbook.md**：部署流程、蓝绿升级、故障排查
2. **environment-lessons-learned.md**：环保缺陷修复（Mock 数据库、Jest 配置）
3. **database-migration-policy.md**：迁移规范与版本管理
4. **tech.md**：技术选型与权衡文档

### 维护计划

| 文档 | 更新频率 | 触发条件 |
|------|---------|---------|
| deployment-runbook.md | 每个 release | 发布时 |
| environment-lessons-learned.md | 新缺陷修复后 | 缺陷 close 时 |
| database-migration-policy.md | 数据库变更后 | schema 变更时 |
| tech.md | 每个大版本 | v2.0 或技术更新 |

---

## 🎓 开发工作流

### Spec Pack 流程

本项目遵循 `AISDLC Spec Pack` 流程：

```
R（需求）→ D（设计）→ I（实现）→ V（验证）→ Merge-back（晋升）
```

各阶段产物位于 `.aisdlc/specs/001-competitor-monitoring/` 下：
- `requirements/` - 需求文档
- `design/` - 设计文档
- `implementation/` - 实现计划与代码
- `verification/` - 测试计划与报告

### 增量开发

后续需求（如 V1.1、V1.5）应：
1. 创建新 Spec Pack 分支（`002-xxx`）
2. 复用 `.aisdlc/project/` 中的决策与标准
3. 参考 `environment-lessons-learned.md` 避免重复踩坑
4. 完成后同样做"晋升"回写至 `project/*`

---

## 📞 支持与反馈

| 问题类型 | 位置 |
|---------|------|
| 部署问题 | 见 `.aisdlc/project/ops/deployment-runbook.md` |
| 环保问题 | 见 `.aisdlc/project/ops/environment-lessons-learned.md` |
| 数据库问题 | 见 `.aisdlc/project/ops/database-migration-policy.md` |
| 技术选型疑问 | 见 `.aisdlc/project/memory/tech.md` |
| 功能验收 | 见 `.aisdlc/specs/001-competitor-monitoring/verification/report.md` |

---

## 📋 版本历史

### v1.0.0 (2026-06-17) ✅

**首个生产版本**

- 核心功能完成：采集 + 检测 + 报告 + 邮件
- 20/20 测试用例通过
- 所有验收条件达标
- 项目级知识库建立

### v1.1 (Planned)

- 用户认证与权限隔离
- Redis 缓存层
- 异步消息队列

### v2.0 (Planned)

- AI 分析与洞察
- 分布式任务支持
- 实时推送（WebSocket）

---

**项目主页**：`https://github.com/xytsidashuaige/FIRST-PROJECT`  
**维护者**：AI-driven DLC Team  
**最后更新**：2026-06-17  
**许可证**：MIT（推荐配置）
