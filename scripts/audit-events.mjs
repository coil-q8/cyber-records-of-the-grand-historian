import { readdir, readFile } from 'node:fs/promises'

const dataDirectory = new URL('../data/', import.meta.url)
const readJson = async (path) => JSON.parse(await readFile(new URL(path, dataDirectory), 'utf8'))

const rawEvents = await readJson('events.json')
const progress = await readJson('research-progress.json')
const batchFiles = (await readdir(dataDirectory))
  .filter((name) => /^phase2-batch-\d+\.json$/u.test(name))
  .sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))

const structuralErrors = []
const qualityWarnings = []
const batchDataById = {}
const batchNameById = {}

for (const batchFile of batchFiles) {
  const batch = await readJson(batchFile)
  for (const [id, details] of Object.entries(batch)) {
    if (batchDataById[id]) {
      structuralErrors.push(`${id}: duplicated in ${batchNameById[id]} and ${batchFile}`)
      continue
    }
    batchDataById[id] = details
    batchNameById[id] = batchFile
  }
}

const rawById = new Map(rawEvents.map((event) => [event.id, event]))
const merged = rawEvents.map((event) => ({ ...event, ...(batchDataById[event.id] ?? {}) }))
const mergedById = new Map(merged.map((event) => [event.id, event]))

const baseFields = [
  'id', 'archiveCode', 'title', 'year', 'date', 'category', 'severity', 'evidenceLevel',
  'evidenceBasis', 'status', 'subjectType', 'subjects', 'tags', 'summary', 'historicalMeaning',
  'sources', 'featured',
]
const requiredText = [
  'summary', 'initialNarrative', 'publicQuestion', 'mediaRole', 'investigation',
  'finalConclusion', 'historianNote',
]
const requiredArrays = [
  'verifiedFacts', 'disputedClaims', 'debunkedClaims', 'unresolvedQuestions',
  'timeline', 'propagationChain',
]
const lengthRanges = {
  // 下限用于捕捉占位句；不再用统一长篇幅迫使每个条目补模板文字。
  summary: [40, 700],
  initialNarrative: [50, 1400],
  publicQuestion: [40, 1000],
  mediaRole: [20, 1100],
  investigation: [70, 1800],
  finalConclusion: [40, 1000],
  historianNote: [30, 700],
}
const validStatuses = ['untouched', 'researching', 'researched', 'needs-review', 'disputed']
const studiedStatuses = new Set(['researched', 'needs-review', 'disputed'])
const validSourceTypes = new Set([
  '司法文书', '公安通报', '行政调查', '行政处罚', '纪委监察', '网民原始内容', '当事方材料',
  '机构原始材料', '新华社报道', '调查报道', '媒体报道', '门户转载', '自媒体', '其他',
])
const validSourceRoles = new Set([
  '事实依据', '当事说法', '调查过程', '处理结果', '机构回应', '制度回应',
  '公众讨论', '传播链证据', '技术背景', '历史报道', '线索',
])
const validArchiveStatuses = new Set(['在线', '已删除', '已失效', '链接失效', '仅存截图', '仅存转载', '已有网页存档', '待补证'])
const mediaSourceTypes = new Set(['新华社报道', '调查报道', '媒体报道', '门户转载', '自媒体'])

const ids = new Set()
for (const event of rawEvents) {
  if (!event.id || ids.has(event.id)) structuralErrors.push(`events.json: invalid or duplicate event id ${event.id}`)
  ids.add(event.id)
  for (const field of baseFields) {
    if (event[field] === undefined || event[field] === null || event[field] === '') {
      structuralErrors.push(`${event.id}: missing base field ${field}`)
    }
  }
}

for (const id of Object.keys(batchDataById)) {
  if (!rawById.has(id)) structuralErrors.push(`${batchNameById[id]}: unknown event id ${id}`)
}
for (const event of merged) {
  if (!progress[event.id]) structuralErrors.push(`${event.id}: missing research-progress record`)
}
for (const [id, item] of Object.entries(progress)) {
  if (!mergedById.has(id)) structuralErrors.push(`research-progress.json: unknown event id ${id}`)
  if (!validStatuses.includes(item.status)) structuralErrors.push(`${id}: invalid research status ${item.status}`)
  if (!Number.isFinite(item.completeness) || item.completeness < 0 || item.completeness > 100) {
    structuralErrors.push(`${id}: completeness must be between 0 and 100`)
  }
  if (batchDataById[id] && item.status === 'untouched') {
    structuralErrors.push(`${id}: has phase-two data but progress is untouched`)
  }
  if (studiedStatuses.has(item.status) && !batchDataById[id]) {
    qualityWarnings.push(`${id}: status is ${item.status}, but no phase2 batch data was found`)
  }
  const event = mergedById.get(id)
  const progressNumberFields = ['sourceCount', 'rank1Count', 'rank2Count', 'rank3Count', 'rank4Count', 'rank5Count']
  const progressBooleanFields = ['hasOriginalPost', 'hasPublicDiscussion', 'hasInstitutionResponse', 'hasMediaCoverage', 'hasFinalOutcome', 'hasTimeline']
  for (const field of progressNumberFields) {
    if (!Number.isInteger(item[field]) || item[field] < 0) structuralErrors.push(`${id}: invalid progress quality field ${field}`)
  }
  for (const field of progressBooleanFields) {
    if (typeof item[field] !== 'boolean') structuralErrors.push(`${id}: invalid progress quality field ${field}`)
  }
  if (!['unreviewed', 'reviewed', 'needs-review', 'disputed'].includes(item.factCheckStatus)) {
    structuralErrors.push(`${id}: invalid factCheckStatus ${item.factCheckStatus}`)
  }
  if (event?.sources) {
    const actualRankCounts = Object.fromEntries([1, 2, 3, 4, 5].map((rank) => [rank, event.sources.filter((source) => source.sourceRank === rank).length]))
    if (item.sourceCount !== event.sources.length) structuralErrors.push(`${id}: progress sourceCount does not match event sources`)
    for (const rank of [1, 2, 3, 4, 5]) {
      if (item[`rank${rank}Count`] !== actualRankCounts[rank]) structuralErrors.push(`${id}: progress rank${rank}Count does not match event sources`)
    }
  }
}

const missingFieldCounts = Object.fromEntries([...requiredText, ...requiredArrays].map((field) => [field, 0]))
const rankEventCounts = Object.fromEntries([1, 2, 3, 4, 5].map((rank) => [rank, 0]))
const sourceRankCounts = Object.fromEntries([1, 2, 3, 4, 5].map((rank) => [rank, 0]))
let missingUrlSourceCount = 0
let lacksRank1Count = 0
let lacksRank2Count = 0
let mediaOnlyCount = 0
let originalCommentCount = 0
let summarizedCommentCount = 0
let incompleteOriginalCommentCount = 0

for (const event of merged) {
  for (const field of requiredText) {
    if (typeof event[field] !== 'string' || !event[field].trim()) missingFieldCounts[field]++
  }
  for (const field of requiredArrays) {
    if (!Array.isArray(event[field])) missingFieldCounts[field]++
  }

  if (!Array.isArray(event.sources) || event.sources.length === 0) {
    structuralErrors.push(`${event.id}: sources must be a non-empty array`)
    lacksRank1Count++
    lacksRank2Count++
    continue
  }

  const sourceIds = new Set()
  const ranks = new Set()
  for (const source of event.sources) {
    if (!source.id || sourceIds.has(source.id)) structuralErrors.push(`${event.id}: invalid/duplicate source id ${source.id}`)
    sourceIds.add(source.id)
    for (const field of ['title', 'institution', 'date', 'sourceRank', 'sourceType', 'sourceRole', 'archiveStatus']) {
      if (source[field] === undefined || source[field] === null || source[field] === '') {
        structuralErrors.push(`${event.id}/${source.id ?? 'unknown'}: missing source field ${field}`)
      }
    }
    if (!Number.isInteger(source.sourceRank) || source.sourceRank < 1 || source.sourceRank > 5) {
      structuralErrors.push(`${event.id}/${source.id}: invalid sourceRank ${source.sourceRank}`)
    } else {
      ranks.add(source.sourceRank)
      sourceRankCounts[source.sourceRank]++
    }
    if (!validSourceTypes.has(source.sourceType)) structuralErrors.push(`${event.id}/${source.id}: invalid sourceType ${source.sourceType}`)
    if (!validSourceRoles.has(source.sourceRole)) structuralErrors.push(`${event.id}/${source.id}: invalid sourceRole ${source.sourceRole}`)
    if (!validArchiveStatuses.has(source.archiveStatus)) structuralErrors.push(`${event.id}/${source.id}: invalid archiveStatus ${source.archiveStatus}`)
    if (!source.url) {
      missingUrlSourceCount++
      if (!source.note) qualityWarnings.push(`${event.id}/${source.id}: source has no URL and no explanatory note`)
    } else {
      try { new URL(source.url) } catch { structuralErrors.push(`${event.id}/${source.id}: invalid URL ${source.url}`) }
    }
  }
  for (const rank of ranks) rankEventCounts[rank]++
  if (!ranks.has(1)) lacksRank1Count++
  if (!ranks.has(2)) lacksRank2Count++
  if (event.sources.every((source) => mediaSourceTypes.has(source.sourceType))) mediaOnlyCount++

  const citationLists = [
    ...Object.values(event.sectionSources ?? {}),
    ...(event.timeline ?? []).map((item) => item.sourceIds ?? []),
    ...(event.propagationChain ?? []).map((item) => item.sourceIds ?? []),
    ...(event.contentBlocks ?? []).map((item) => item.sourceIds ?? []),
  ]
  for (const sourceId of citationLists.flat()) {
    if (!sourceIds.has(sourceId)) structuralErrors.push(`${event.id}: citation points to missing source ${sourceId}`)
  }

  for (const [commentIndex, comment] of (event.publicComments ?? []).entries()) {
    if (!['原话', '概述'].includes(comment.quoteType)) {
      structuralErrors.push(`${event.id}/publicComments/${commentIndex}: invalid quoteType ${comment.quoteType}`)
    }
    if (!comment.text || !comment.platform || !comment.context) {
      structuralErrors.push(`${event.id}/publicComments/${commentIndex}: missing text, platform or context`)
    }
    if (comment.sourceId && !sourceIds.has(comment.sourceId)) {
      structuralErrors.push(`${event.id}/publicComments/${commentIndex}: sourceId points to missing source ${comment.sourceId}`)
    }
    if (comment.quoteType === '原话') {
      originalCommentCount++
      const requiredOriginalMetadata = ['date', 'url', 'evidenceGrade', 'verificationStatus', 'originType']
      const missing = requiredOriginalMetadata.filter((field) => !comment[field])
      if (missing.length) {
        incompleteOriginalCommentCount++
        qualityWarnings.push(`${event.id}: 民议原话 ${commentIndex + 1} 缺少核验元数据 ${missing.join(', ')}`)
      }
    } else {
      summarizedCommentCount++
    }
  }
}

const statusCounts = Object.fromEntries(validStatuses.map((status) => [status, 0]))
for (const item of Object.values(progress)) statusCounts[item.status] = (statusCounts[item.status] ?? 0) + 1

const researchedEvents = merged.filter((event) => studiedStatuses.has(progress[event.id]?.status))
for (const event of researchedEvents) {
  for (const field of requiredText) {
    if (typeof event[field] !== 'string' || !event[field].trim()) {
      qualityWarnings.push(`${event.id}: 已研究条目缺少 ${field}`)
      continue
    }
    const [minimum, maximum] = lengthRanges[field]
    if (event[field].length < minimum || event[field].length > maximum) {
      qualityWarnings.push(`${event.id}: ${field} is ${event[field].length} chars; expected ${minimum}–${maximum}`)
    }
  }
  for (const field of requiredArrays) {
    if (!Array.isArray(event[field])) qualityWarnings.push(`${event.id}: 已研究条目缺少 ${field} 数组`)
  }
  if (!event.sources.some((source) => source.sourceRank === 1)) {
    qualityWarnings.push(`${event.id}: 已研究条目缺第一等史料`)
  }
  if (!event.sources.some((source) => source.sourceRank === 2)) {
    qualityWarnings.push(`${event.id}: 已研究条目缺第二等互联网史料`)
  }
}

for (const event of researchedEvents.filter((item) => ['disputed', 'needs-review'].includes(progress[item.id]?.status))) {
  const text = [event.summary, event.investigation, event.finalConclusion].join(' ')
  const dangerous = text.match(/实锤|百分之百|必然为|确定是骗子|已证实[^。]{0,12}致癌|确认[^。]{0,12}致癌|主动造假者/gu)
  if (dangerous) qualityWarnings.push(`${event.id}: categorical wording requires review: ${[...new Set(dangerous)].join(', ')}`)
}

const templateFragments = [
  '本条以公开文书、当事方材料和传播现场相互校验',
  '事件进入公共议程后，报道、企业回应与监管材料先后出现',
  '这组问题不能只靠情绪回答',
  '档案将“已经查实”“当事方解释”“公共质疑”和“仍待回答”分栏保存',
  '对这类依赖平台分发的事件，删号只是传播史中的一个节点',
  '这些条目只有在事实与不确定性同时可见时才有史料价值',
]
for (const event of researchedEvents) {
  const prose = requiredText.map((field) => event[field] ?? '').join('\n')
  for (const fragment of templateFragments) {
    if (prose.includes(fragment)) qualityWarnings.push(`${event.id}: 仍含第三阶段禁用模板句“${fragment}”`)
  }
}

const sentenceOwners = new Map()
for (const event of researchedEvents) {
  for (const field of requiredText) {
    for (const sentence of String(event[field] ?? '').split(/(?<=[。！？；])\s*/u)) {
      const normalized = sentence.replace(/\s+/gu, '').trim()
      if (normalized.length < 45) continue
      const owners = sentenceOwners.get(normalized) ?? new Set()
      owners.add(event.id)
      sentenceOwners.set(normalized, owners)
    }
  }
}
for (const [sentence, owners] of sentenceOwners) {
  if (owners.size >= 3) {
    qualityWarnings.push(`${[...owners][0]}: 长句在 ${owners.size} 条事件中完全重复，疑似模板：“${sentence.slice(0, 54)}${sentence.length > 54 ? '……' : ''}”`)
  }
}

if (mergedById.get('cyber-2024-cj-009')?.category !== '丑角') {
  structuralErrors.push('cyber-2024-cj-009: 姜萍 record must remain 丑角')
}

const categoryCounts = merged.reduce((counts, event) => {
  counts[event.category] = (counts[event.category] ?? 0) + 1
  return counts
}, {})
const untouchedCount = statusCounts.untouched
const researchingCount = statusCounts.researching
const unresearchedCount = untouchedCount + researchingCount
const missingCoreFieldTotal = requiredText.reduce((sum, field) => sum + missingFieldCounts[field], 0)
const missingEvidenceFieldTotal = requiredArrays.reduce((sum, field) => sum + missingFieldCounts[field], 0)
const contentReviewComplete = untouchedCount === 0
  && researchingCount === 0
  && statusCounts['needs-review'] === 0
  && statusCounts.disputed === 0
  && missingCoreFieldTotal === 0
  && requiredArrays.slice(0, 4).every((field) => missingFieldCounts[field] === 0)
  && lacksRank1Count === 0
  && lacksRank2Count === 0
  && incompleteOriginalCommentCount === 0
  && structuralErrors.length === 0

if (untouchedCount) qualityWarnings.unshift(`全库仍有 ${untouchedCount} 条 untouched，尚未进入实质研究`)
if (researchingCount) qualityWarnings.unshift(`全库仍有 ${researchingCount} 条 researching，尚未完成研究`)
if (missingCoreFieldTotal) qualityWarnings.unshift(`全库核心正文累计缺失 ${missingCoreFieldTotal} 个字段`)
if (lacksRank1Count) qualityWarnings.push(`${lacksRank1Count} 条事件缺第一等史料`)
if (lacksRank2Count) qualityWarnings.push(`${lacksRank2Count} 条事件缺第二等互联网史料`)
if (mediaOnlyCount) qualityWarnings.push(`${mediaOnlyCount} 条事件只有媒体来源`)

console.log('\n《赛博史记》第三阶段全库审计')
console.log('='.repeat(64))
console.log(`批次文件: ${batchFiles.length ? batchFiles.join(', ') : '无'}`)
console.log(`总事件数: ${merged.length}`)
console.log(`五卷数量: ${Object.entries(categoryCounts).map(([key, value]) => `${key} ${value}`).join(' / ')}`)
console.log(`已研究事件: ${researchedEvents.length}`)
console.log(`researched: ${statusCounts.researched}`)

console.log('\n1. 数据结构错误')
console.log(`数量: ${structuralErrors.length}`)
if (structuralErrors.length) console.log(`- ${structuralErrors.slice(0, 80).join('\n- ')}`)
if (structuralErrors.length > 80) console.log(`- ……另有 ${structuralErrors.length - 80} 项未展开`)

console.log('\n2. 已研究事件质量问题')
const researchedWarnings = qualityWarnings.filter((warning) => /^cyber-/u.test(warning))
console.log(`数量: ${researchedWarnings.length}`)
if (researchedWarnings.length) console.log(`- ${researchedWarnings.slice(0, 80).join('\n- ')}`)
if (researchedWarnings.length > 80) console.log(`- ……另有 ${researchedWarnings.length - 80} 项未展开`)

console.log('\n3. 未研究事件数量')
console.log(`数量: ${unresearchedCount}（untouched ${untouchedCount} / researching ${researchingCount}）`)

console.log('\n4. 缺失字段数量')
for (const field of requiredText) console.log(`${field}: ${missingFieldCounts[field]}`)
for (const field of requiredArrays) console.log(`${field}: ${missingFieldCounts[field]}`)
console.log(`核心正文缺失合计: ${missingCoreFieldTotal}`)
console.log(`证据/时间线结构缺失合计: ${missingEvidenceFieldTotal}`)

console.log('\n5. 缺第一等史料数量')
console.log(`数量: ${lacksRank1Count}`)

console.log('\n6. 缺第二等史料数量')
console.log(`数量: ${lacksRank2Count}`)

console.log('\n7. 只有媒体来源的事件数量')
console.log(`数量: ${mediaOnlyCount}`)

console.log('\n8. untouched 数量')
console.log(`数量: ${untouchedCount}`)

console.log('\n9. needs-review 数量')
console.log(`数量: ${statusCounts['needs-review']}`)

console.log('\n10. disputed 数量')
console.log(`数量: ${statusCounts.disputed}`)

console.log('\n补充：全库史料分布')
console.log(`无直接 URL 的来源: ${missingUrlSourceCount}`)
console.log(`各等级来源条数: ${[1, 2, 3, 4, 5].map((rank) => `R${rank}=${sourceRankCounts[rank]}`).join(' / ')}`)
console.log(`各等级覆盖事件数: ${[1, 2, 3, 4, 5].map((rank) => `R${rank}=${rankEventCounts[rank]}`).join(' / ')}`)

console.log('\n补充：民间史料呈现')
console.log(`可核验逐字原话: ${originalCommentCount}`)
console.log(`编者概述（不得冒充原话）: ${summarizedCommentCount}`)
console.log(`缺核验元数据的逐字原话: ${incompleteOriginalCommentCount}`)

console.log('\n审校结论')
if (contentReviewComplete) {
  console.log('全库内容审校：通过。142 条均已进入实质研究且核心字段完整。')
} else {
  console.log('全库内容审校：未通过／尚未完成。')
  console.log(`原因: untouched=${untouchedCount}, researching=${researchingCount}, needs-review=${statusCounts['needs-review']}, disputed=${statusCounts.disputed}, 缺第一等史料=${lacksRank1Count}, 缺第二等史料=${lacksRank2Count}, 核心正文缺失=${missingCoreFieldTotal}, 结构错误=${structuralErrors.length}`)
}
console.log(`质量 warning: ${qualityWarnings.length}`)
console.log('说明: audit 退出码只反映数据结构是否损坏；warning 与“内容尚未完成”不会被伪装成全库通过。')

if (structuralErrors.length) process.exitCode = 1
