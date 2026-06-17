# Competitor A Simulator

这是给 Lensmor Monitor 使用的可控竞品模拟站点。

## Vercel 配置

- Root Directory: `competitor-a`
- Framework Preset: `Other`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

## 如何触发监控变化

修改 `source/data.json` 中任意字段，例如：

- `price`
- `stock`
- `promo`
- `announcement`
- `features`
- `lastUpdated`

提交并推送后，Vercel 会重新部署。把部署后的 URL 添加到 Lensmor Monitor 的竞对列表中，即可用于测试采集与变化检测。
