# 《赛博史记》第三阶段开发报告

更新日期：2026-08-28

## 本阶段完成项

- 第 09、10、11 批共 37 条记录已重新生成，删除统一方法论尾句、统一“史家曰”尾句和生成式评论概述。
- 37 条记录的 `summary`、`initialNarrative`、`publicQuestion`、`mediaRole`、`investigation`、`finalConclusion`、`historianNote` 均为 37/37 唯一文本；第三阶段禁用模板句检出为 0。
- 详情页由六个同权重说明模块改为“本事、始末、考证、史家曰”四层。时间线、传播脉络、民间史料和事实边界成为相应章节的附属史料，不再与正文争夺层级。
- 史料列表前置到“考证”，并按第一等至第五等排序；正文引文序号仍指向原始来源编号。
- 前端不再显示数值完整度，统一映射为“成案、待考、续考、疑传”。
- 人工建立 12 个 `caseId`，连接 24 条同一现实事件的不同卷目记录；详情页显示“互见 · 同案异卷”。
- 首页和主导航建立“本纪、世家、列传、表、书、索隐”的史记体信息架构原型，同时保留原五卷分类和全部既有网址。
- 原“人物与事件关系图”改名为“档案关系索引”，明确其只表达主题、年份、卷目和事件之间的编辑关联。
- 统计页的四张 KPI 卡改为表册式摘要，保留实时计算和交互图表。
- 民间史料类型增加 A—E 等级、核验状态、首发位置、来源映射、独立旁证和传播量快照字段。逐字引语与编者概述在界面和审计中严格分开。

## 数据与审计结果

- 批次模块：11
- 总事件：142
- 已进入研究批次：142
- `researched`：85
- `needs-review`：36
- `disputed`：21
- `untouched`：0
- 核心正文缺失：0
- 证据/时间线结构缺失：0
- 数据结构错误：0
- 缺第一等史料：36 条
- 缺第二等互联网史料：32 条
- 只有媒体来源：0 条
- 民间史料逐字原话：0 条
- 民间史料编者概述：81 条
- 审计 warning：70 条，其中事件级质量问题 68 条

审计结论仍为“全库内容审校未通过／尚未完成”。退出码只表示数据结构是否损坏，不会用结构正确掩盖史料不足、待复核或争议状态。

## 主要改动文件

- `scripts/generate-phase2-batch-09.mjs`
- `scripts/generate-phase2-batch-10.mjs`
- `scripts/generate-phase2-batch-11.mjs`
- `data/phase2-batch-09.json`
- `data/phase2-batch-10.json`
- `data/phase2-batch-11.json`
- `data/case-links.ts`
- `types/event.ts`
- `lib/events.ts`
- `app/pages/EventPage.tsx`
- `app/pages/HomePage.tsx`
- `app/pages/AboutPage.tsx`
- `app/pages/GraphPage.tsx`
- `app/pages/StatisticsPage.tsx`
- `app/styles.css`
- `components/Header.tsx`
- `components/Footer.tsx`
- `scripts/audit-events.mjs`
- `scripts/smoke-test.mjs`

## 验证

- `npm run check`：通过
- `npm run audit`：结构错误 0；内容审校明确未通过并保留 70 条 warning
- `npm run build`：通过
- `npm run test:smoke`：21 项通过，覆盖桌面与移动端、搜索、筛选、收藏、随机翻史、同案互见、史料跳转、关系索引、统计与主题切换
- 1748×859 桌面视口与 390×844 移动视口已作截图检查；未发现横向溢出、文字遮挡或主要控件错位。

## 尚待后续史料工作

- 36 条记录缺第一等史料，32 条缺第二等互联网史料。
- 现有 81 条民议材料均为编者概述，不能称为“民议原声”。下一轮应逐平台进入原帖、评论区和网页存档，按 A—E 规则补录可回溯逐字材料。
- 39 个来源暂无直接 URL，需要继续寻找原页面、正式文书或可靠网页存档。
- 生产构建仍提示主入口包大于 500 kB；不影响运行，但可在后续性能阶段拆分事件数据与图表依赖。
