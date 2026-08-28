import { readdir, readFile, writeFile } from 'node:fs/promises'

const dataDirectory = new URL('../data/', import.meta.url)
const readJson = async (name) => JSON.parse(await readFile(new URL(name, dataDirectory), 'utf8'))
const rawEvents = await readJson('events.json')
const batchFiles = (await readdir(dataDirectory))
  .filter((name) => /^phase2-batch-\d+\.json$/u.test(name))
  .sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true }))

const detailsById = {}
const batchById = {}
for (const batchFile of batchFiles) {
  const batch = await readJson(batchFile)
  for (const [id, details] of Object.entries(batch)) {
    if (detailsById[id]) throw new Error(`${id} is duplicated in ${batchById[id]} and ${batchFile}`)
    detailsById[id] = details
    batchById[id] = batchFile.replace(/\.json$/u, '')
  }
}

const statusOverrides = new Map([
  ['cyber-2025-yc-017', 'disputed'],
  ['cyber-2025-jr-011', 'disputed'],
  ['cyber-2026-jr-035', 'disputed'],
  ['cyber-2026-cj-011', 'disputed'],
  ['cyber-2026-jr-036', 'disputed'],
  ['cyber-2023-js-004', 'needs-review'],
  ['cyber-2019-cj-013', 'needs-review'],
  ['cyber-2024-cj-019', 'needs-review'],
  ['cyber-2017-eq-042', 'needs-review'],
  ['cyber-2021-yc-007', 'needs-review'],
  ['cyber-2020-yc-022', 'needs-review'],
  ['cyber-2021-yc-023', 'needs-review'],
  ['cyber-2019-jr-013', 'disputed'],
  ['cyber-2020-cj-015', 'needs-review'],
  ['cyber-2017-js-001', 'needs-review'],
  ['cyber-2018-eq-023', 'needs-review'],
  ['cyber-2019-jr-014', 'needs-review'],
  ['cyber-2023-cj-007', 'needs-review'],
  ['cyber-2018-js-002', 'needs-review'],
  ['cyber-2024-js-006', 'needs-review'],
  ['cyber-2020-eq-009', 'needs-review'],
  ['cyber-2022-yc-010', 'needs-review'],
  ['cyber-2020-jr-016', 'disputed'],
  ['cyber-2016-jr-037', 'disputed'],
  ['cyber-2023-cj-006', 'disputed'],
  ['cyber-2022-cj-020', 'disputed'],
  ['cyber-2026-js-007', 'needs-review'],
  ['cyber-2023-yc-015', 'needs-review'],
  ['cyber-2021-cj-017', 'disputed'],
  ['cyber-2021-cj-016', 'needs-review'],
  ['cyber-2022-yc-013', 'needs-review'],
  ['cyber-2025-eq-018', 'needs-review'],
  ['cyber-2025-eq-019', 'needs-review'],
  ['cyber-2017-eq-022', 'disputed'],
  ['cyber-2019-eq-025', 'needs-review'],
  ['cyber-2023-eq-034', 'disputed'],
  ['cyber-2025-yc-018', 'needs-review'],
  ['cyber-2019-yc-019', 'disputed'],
  ['cyber-2019-yc-020', 'disputed'],
  ['cyber-2023-eq-035', 'needs-review'],
  ['cyber-2025-eq-038', 'needs-review'],
  ['cyber-2025-eq-039', 'needs-review'],
  ['cyber-2026-eq-040', 'needs-review'],
  ['cyber-2026-eq-041', 'needs-review'],
  ['cyber-2019-eq-044', 'disputed'],
  ['cyber-2022-eq-045', 'disputed'],
  ['cyber-2026-eq-046', 'needs-review'],
  ['cyber-2024-jr-008', 'needs-review'],
  ['cyber-2025-jr-009', 'needs-review'],
  ['cyber-2025-jr-010', 'needs-review'],
  ['cyber-2026-jr-029', 'needs-review'],
  ['cyber-2026-jr-030', 'needs-review'],
  ['cyber-2025-yc-029', 'disputed'],
  ['cyber-2020-yc-030', 'disputed'],
  ['cyber-2024-yc-032', 'needs-review'],
  ['cyber-2026-cj-012', 'disputed'],
  ['cyber-2020-cj-014', 'disputed'],
])

const coreFields = [
  'summary', 'initialNarrative', 'publicQuestion', 'mediaRole', 'investigation',
  'finalConclusion', 'historianNote',
]
const evidenceFields = [
  'verifiedFacts', 'disputedClaims', 'debunkedClaims', 'unresolvedQuestions',
  'timeline', 'propagationChain',
]
const institutionalTypes = new Set([
  '司法文书', '公安通报', '行政调查', '纪委监察', '机构原始材料',
])
const mediaTypes = new Set(['新华社报道', '调查报道', '媒体报道', '门户转载', '自媒体'])

const qualityFor = (event) => {
  const sources = Array.isArray(event.sources) ? event.sources : []
  const rankCounts = Object.fromEntries([1, 2, 3, 4, 5].map((rank) => [rank, sources.filter((item) => item.sourceRank === rank).length]))
  const hasOriginalPost = sources.some((item) => item.sourceType === '网民原始内容' && ['当事说法', '传播链证据'].includes(item.sourceRole))
  const hasPublicDiscussion = (event.publicComments?.length ?? 0) > 0 || sources.some((item) => item.sourceRole === '公众讨论')
  const hasInstitutionResponse = sources.some((item) => institutionalTypes.has(item.sourceType) || item.sourceRole === '当事说法')
  const hasMediaCoverage = sources.some((item) => mediaTypes.has(item.sourceType))
  const hasFinalOutcome = typeof event.finalConclusion === 'string' && event.finalConclusion.trim().length >= 100 && rankCounts[1] > 0
  const hasTimeline = Array.isArray(event.timeline) && event.timeline.length >= 2
  return {
    sourceCount: sources.length,
    rank1Count: rankCounts[1],
    rank2Count: rankCounts[2],
    rank3Count: rankCounts[3],
    rank4Count: rankCounts[4],
    rank5Count: rankCounts[5],
    hasOriginalPost,
    hasPublicDiscussion,
    hasInstitutionResponse,
    hasMediaCoverage,
    hasFinalOutcome,
    hasTimeline,
  }
}

const completenessFor = (event, quality, studied) => {
  if (!studied) return event.sources?.some((item) => item.url) ? 24 : 18
  let score = 0
  score += coreFields.filter((field) => typeof event[field] === 'string' && event[field].trim()).length * 5
  score += evidenceFields.filter((field) => Array.isArray(event[field])).length * 3
  score += quality.rank1Count > 0 ? 10 : 0
  score += quality.rank2Count > 0 ? 10 : 0
  score += quality.hasOriginalPost ? 5 : 0
  score += quality.hasPublicDiscussion ? 5 : 0
  score += quality.hasFinalOutcome ? 5 : 0
  score += quality.hasTimeline ? 4 : 0
  score += quality.hasInstitutionResponse ? 2 : 0
  score += quality.hasMediaCoverage ? 2 : 0
  score += event.sources?.some((item) => item.url) ? 4 : 0
  return Math.min(100, score)
}

const progress = Object.fromEntries(rawEvents.map((rawEvent) => {
  const details = detailsById[rawEvent.id]
  const studied = Boolean(details)
  const event = { ...rawEvent, ...(details ?? {}) }
  const status = statusOverrides.get(rawEvent.id) ?? (studied ? 'researched' : 'untouched')
  const quality = qualityFor(event)
  const factCheckStatus = status === 'untouched' ? 'unreviewed'
    : status === 'disputed' ? 'disputed'
      : status === 'needs-review' ? 'needs-review'
        : 'reviewed'

  return [rawEvent.id, {
    title: rawEvent.title,
    year: rawEvent.year,
    status,
    completeness: completenessFor(event, quality, studied),
    batch: batchById[rawEvent.id] ?? null,
    lastReviewed: studied ? '2026-08-20' : null,
    updatedAt: studied ? '2026-08-20' : null,
    ...quality,
    factCheckStatus,
    notes: status === 'untouched' ? '尚未进入第二阶段逐条研究。'
      : status === 'needs-review' ? '主体事实已整理，仍有关键来源或后续处置需要复核。'
        : status === 'disputed' ? '已整理可核事实，但核心争议仍无足够材料定论。'
          : '',
  }]
}))

await writeFile(
  new URL('research-progress.json', dataDirectory),
  `${JSON.stringify(progress, null, 2)}\n`,
  'utf8',
)
console.log(`Wrote research progress for ${Object.keys(progress).length} records from ${batchFiles.length} batches.`)
