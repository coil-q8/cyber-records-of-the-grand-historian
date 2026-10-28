# 赛博史记

基于《赛博史记1.0_截止2026年8月15日.docx》构建的 2016—2026 中国互联网公共事件数字档案。

顶部导航支持深色／浅色档案主题切换，选择会保存在当前浏览器中。

2026-10-28 续编版：原稿 142 篇，新增 8 篇，共 150 篇；另对武大图书馆相关 2 篇补入校方原始通报，明确处分撤销。此次为选择性检索、补录与修订，不代表原稿全部重新通过内容审校。

新增 `/updates`（续编札记）及 `/compare`（双篇对读）。对读可检索选篇、交换左右篇、切换事实／时间／来源视图；选择随 URL 保存，可直接分享和刷新。档案库支持空格分隔多关键词、续编筛选及最近入库排序，浏览器返回时恢复 URL 中的筛选。

## 运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run preview
```

Cloudflare 构建／部署使用 Node 22 及以上（`.node-version` 固定云端版本）；本机 Node 20 可运行 Vite，但不能直接运行当前 Wrangler。

## 数据

- `data/events.json`：从 Word 表格抽取的 142 条结构化事件，含五级来源元数据。
- `data/phase2-batch-01.json` 至 `data/phase2-batch-11.json`：第二阶段 142 条深挖卷宗，含完整正文、事实四栏、时间线、传播链、民间留档与段落引文。
- `data/continuations/*.json`：独立续编资料，完整篇目并入搜索、统计、图谱、收藏和随机翻史。原稿抽取不会覆盖这些资料。
- `data/archive-meta.json`：本版检索截止日、检索范围、检索词与旧篇修订记录。
- `data/research-progress.json`：合并原稿、研究批次和续编后的研究状态与完整度；完整度不代表真实性。构建前自动再生成。
- `scripts/extract-events.ps1`：可重复执行的数据抽取脚本，会校验条目总数。
- `data/editorial.ts`：Word“重点大案纪传”中的扩展段落。
- `PHASE2_REPORT.md`：第二阶段完成情况、审计口径、证据覆盖与已知限制。

重新抽取：

```powershell
./scripts/extract-events.ps1
```

原稿已附的链接会进入来源字段；没有直接链接的条目明确标记为“待补证”，不会生成假地址。

## 验证

```bash
npm run audit
npm run check
npm run build
npm run test:smoke
```

烟测使用本机 Microsoft Edge，覆盖全文搜索、组合筛选、收藏持久化、随机翻史、详情键盘翻页、统计、关系图谱和移动端溢出检查。若浏览器不在默认路径，可设置 `CYBER_BROWSER_PATH`。

审计覆盖原稿与全部续编，分别报告结构错误、内容质量、未研究状态、字段缺失和各等级史料缺口，并检查新篇核验日期与来源日期不超过截止日。`0 error` 只表示数据结构可用，不表示所有事实争议均已解决；`needs-review`、`disputed`、待补核验 URL 及缺少第一／第二等史料的条目会继续以 warning 保留。

## 生产部署

公网地址：<https://cyber-records-of-the-grand-historian.cyber-records-of-the-grand-historian.workers.dev/>

Cloudflare Workers + Static Assets，从 `dist` 提供资产，`wrangler.jsonc` 显式开启 SPA fallback。现有 Workers Builds 绑定 GitHub `main`；提交并推送后由 Cloudflare 执行 `npm run build`、`npx wrangler deploy`，不依赖本机保持开机。`vercel.json` 是保留的兼容配置，不参与 Cloudflare 部署。

本地生产 smoke test（先 `npm run build` 并启动 `npm run preview`）：

```powershell
$env:CYBER_ARCHIVE_URL = 'http://127.0.0.1:4173'
npm run test:deployment
```

线上同一测试可从 GitHub Actions 的 `Public deployment smoke test` 手动触发，覆盖新旧路由、所有续编详情、子页刷新、资源、对读与筛选交互、移动端和浏览器错误。

## 永久编纂原则

> 《赛博史记》不将媒体品牌视为真相担保，也不将普通网友视为天然不可信。司法与正式调查用于确定事实边界，互联网原帖、评论与跟评用于保存民间记忆、发现过程和舆论现场；媒体则既是二手参考资料，也是需要被考察的传播参与者。对于任何重大指控，最终均应追溯原始证据，并明确区分“当时人们相信什么”与“后来能够证明什么”。

除新华社外，大众媒体原则上不高于第四等史料；无独立采访、只是转载的内容列为第五等。网友原帖属于重要互联网原史料，但不自动证明其中的重大指控。
