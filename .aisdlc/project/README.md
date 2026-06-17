# .aisdlc/project/ - 项目级 SSOT（长期资产）

> 本目录存放所有**项目级**可复用知识库与标准。  
> 与 `.aisdlc/specs/*/` 不同，这里的资产面向**全项目与后续迭代**。

---

## 🗂️ 目录结构

```
.aisdlc/project/
├── memory/                          # 北极星与基础决策
│   ├── tech.md                      # 技术栈与架构决策
│   └── [产品/运维/术语/流程等]      # 按需扩展
├── ops/                             # 运维与部署标准
│   ├── deployment-runbook.md        # 部署/蓝绿升级/故障排查
│   ├── environment-lessons-learned.md # 缺陷修复经验
│   ├── database-migration-policy.md # 数据库版本管理
│   └── [监控/告警/日志等]           # 按需扩展
├── components/                      # 技术模块 SSOT（可选）
│   ├── index.md                     # 模块地图与导航
│   └── [module-name].md             # 模块页（API/Data 契约）
├── products/                        # 业务模块/产品功能（可选）
│   ├── index.md                     # 产品地图
│   └── [product-name].md            # 产品功能页
├── contracts/                       # 用户/权限/集成契约（可选）
├── nfr/                             # 非功能需求标准（可选）
├── ASSETS.md                        # 资产清单与维护计划
└── README.md                        # 本文件
```

---

## 📖 核心文档（必读）

### 1. 技术决策（memory/tech.md）

**何时读**：决定用什么技术、权衡方案、理解设计理由

**包含**：
- 核心技术栈（为什么选 Puppeteer、SendGrid、node-cron）
- 设计权衡（完全对比 vs 相似度；同步 vs 异步）
- 已知限制与后续扩展点（V1.1/V1.5/V2.0）

---

### 2. 部署指南（ops/deployment-runbook.md）

**何时读**：部署、升级、故障排查

**包含**：
- 一键部署流程
- 蓝绿升级（零停机升级）
- 故障排查与监控
- 健康检查指标

---

### 3. 环保缺陷修复（ops/environment-lessons-learned.md）

**何时读**：遇到环保问题、想避免重复踩坑

**包含**：
- BUG-ENV-001：Mock 数据库自动降级
- Jest/Puppeteer ESM 导出错误修复
- 前端 Lint warnings 处理

**应用场景**：后续项目在开发环保上快速自救

---

### 4. 数据库管理（ops/database-migration-policy.md）

**何时读**：修改数据库 schema、执行迁移、回滚

**包含**：
- 迁移文件命名规范（001_xxx.sql）
- 幂等性与事务包装
- 版本跟踪与备份恢复
- Lensmor Monitor 初始化脚本说明

---

### 5. 资产清单（ASSETS.md）

**何时读**：全项目资产一览、了解验证覆盖、识别后续风险

**包含**：
- 可直接复用的 4 大资产
- 验证证据（17/17 后端测试通过、20/20 用例通过）
- 后续验证项（风险清单）
- 改进建议（V1.1/V1.5/V2.0 方向）

---

## 🚀 快速导航

### 如果我想…

| 问题 | 去这里 |
|------|--------|
| **了解技术为什么这样选** | `memory/tech.md` |
| **部署到生产** | `ops/deployment-runbook.md` |
| **修改数据库 schema** | `ops/database-migration-policy.md` |
| **遇到环保问题** | `ops/environment-lessons-learned.md` |
| **看全项目资产与风险** | `ASSETS.md` |
| **查模块/功能契约** | `components/index.md` 或 `products/index.md` |

---

## 📊 资产复用指南

### 后续项目推荐操作

**场景 1：v1.1 新功能（用户认证）**
1. 创建新 Spec Pack：`002-user-auth`
2. 复用技术决策：参考 `memory/tech.md` 决定技术栈
3. 复用环保经验：直接用 Jest 配置、Mock 数据库方案
4. 复用部署标准：用 `ops/deployment-runbook.md` 的蓝绿部署流程
5. 完成后晋升新资产回 `project/*`

**场景 2：类似爬虫项目（其他竞品源）**
1. 复用 `memory/tech.md` 的爬虫设计（Puppeteer + 重试）
2. 复用 `ops/database-migration-policy.md` 建立数据库版本管理
3. 参考 `ops/deployment-runbook.md` 部署流程

**场景 3：新团队成员入职**
1. 先读 `memory/tech.md` - 了解技术为什么这样
2. 再读 `ops/deployment-runbook.md` - 学会怎么启动
3. 遇到坑查 `ops/environment-lessons-learned.md`

---

## ✅ DoD（完成定义）

项目级知识库"完成"的标准：

- [ ] `memory/tech.md` 完成：技术栈 + 权衡 + 限制 + 后续方向
- [ ] `ops/deployment-runbook.md` 完成：能一键部署 + 蓝绿升级 + 故障排查
- [ ] `ops/environment-lessons-learned.md` 完成：关键缺陷修复 + 复现 + 解决方案
- [ ] `ops/database-migration-policy.md` 完成：迁移规范 + 版本管理 + 恢复过程
- [ ] `ASSETS.md` 完成：资产清单 + 验证状态 + 后续风险 + 改进建议
- [ ] （可选）`components/index.md`：模块地图与依赖关系图
- [ ] （可选）`products/index.md`：业务功能地图
- [ ] 所有文档均可被后续项目快速复用（可追溯、无脑补、有权威入口）

---

## 🔄 维护计划

| 文档 | 更新频率 | 触发条件 | 责任人 |
|------|---------|---------|--------|
| `memory/tech.md` | 每个大版本（V2.0） | 技术重大变更 | Tech Lead |
| `ops/deployment-runbook.md` | 每个 release | 发布新版本 | DevOps |
| `ops/environment-lessons-learned.md` | 新缺陷修复后 | 缺陷 close 时 | 全组 |
| `ops/database-migration-policy.md` | 数据库变更后 | schema 变更时 | Backend |
| `ASSETS.md` | 每个 release | 版本发布 | Tech Lead |

---

## 🚨 常见误用（防范清单）

| 误用行为 | ❌ 错误 | ✅ 正确 |
|---------|--------|--------|
| **索引写细节** | 在 `components/index.md` 里写 API 签名 | 索引只导航；API 在模块页 `components/[module].md` |
| **TODO 散落** | 在正文里写"待补/待确认" | 所有缺口进 `## Evidence Gaps` |
| **脑补契约** | "这个字段应该是 int64，我猜的" | 只写权威入口链接（schema/DDL）+ 已知不变量 |
| **一次性细节** | 把 v1.0 特定的部署脚本合并进 `project/*` | 项目级只写标准与入口；脚本归 Spec Pack |
| **无权威入口** | "用户管理在 UserController" | "用户认证见 `.aisdlc/specs/002-user-auth/design/...`" |

---

## 📚 推荐阅读顺序

**新项目启动**：
1. `memory/tech.md` - 了解技术决策
2. `ops/deployment-runbook.md` - 学会启动
3. `ops/environment-lessons-learned.md` - 避免坑

**维护既有项目**：
1. `ASSETS.md` - 了解资产与风险
2. `ops/deployment-runbook.md` - 部署与故障排查
3. `ops/database-migration-policy.md` - 数据库变更

**架构演进**：
1. `memory/tech.md#已知限制与注意事项` - 了解当前天花板
2. `ASSETS.md#改进建议` - 看后续方向
3. 新 Spec Pack 的 `design/design.md` - 设计新方案

---

## 🎯 长期愿景

本 `project/*` 目录的目标是成为**知识资产库**，支撑：

1. **快速入门**：新人 1 天内了解项目
2. **避免重复**：后续项目复用已验证的方案
3. **自救能力**：团队面对常见问题能自行诊断
4. **演进有向**：清晰的优先级与改进路径（V1.1/V1.5/V2.0）

---

**最后更新**：2026-06-17  
**维护周期**：每 3 个月审查一次  
**下次审查**：2026-09-17
