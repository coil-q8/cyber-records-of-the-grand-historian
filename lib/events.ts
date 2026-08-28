import rawEvents from '../data/events.json'
import { editorialDetails } from '../data/editorial'
import researchProgress from '../data/research-progress.json'
import { caseIdByEventId, caseLinkById } from '../data/case-links'
import type { Category, EventRecord, SourceRecord, SourceRole, SourceType } from '../types/event'

type RawEvent = Omit<EventRecord, 'sources' | 'researchStatus' | 'completeness'> & {
  sources: Array<Partial<SourceRecord> & Pick<SourceRecord, 'title' | 'institution' | 'date' | 'url'>>
}

const phase2ResearchModules = import.meta.glob('../data/phase2-batch-*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Record<string, Partial<EventRecord>>>

const researchById = Object.fromEntries(
  Object.entries(phase2ResearchModules)
    .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
    .flatMap(([, batch]) => Object.entries(batch)),
) as Record<string, Partial<EventRecord>>
const progressById = researchProgress as unknown as Record<string, { status: EventRecord['researchStatus']; completeness: number }>

function inferSourceType(source: Partial<SourceRecord>): SourceType {
  const value = `${source.institution} ${source.url ?? ''}`
  if (!source.url) return '其他'
  if (/reddit|weibo|douban|zhihu|bilibili/.test(value.toLowerCase())) return '网民原始内容'
  if (/纪委|监委|纪检/.test(value)) return '纪委监察'
  if (/法院|裁判文书/.test(value)) return '司法文书'
  if (/公安|警方|平安/.test(value)) return '公安通报'
  if (/gov\.cn|调查组|应急管理部|政府/.test(value)) return '行政调查'
  if (/新华|news\.cn|xinhuanet/.test(value)) return '新华社报道'
  if (/大学|学院|医院|学校/.test(value)) return '机构原始材料'
  if (/新闻|日报|周刊|财经|央视|央广|人民网/.test(value)) return '媒体报道'
  return '其他'
}

function inferSourceRank(source: Partial<SourceRecord>, sourceType: SourceType): 1 | 2 | 3 | 4 | 5 {
  if (['司法文书', '公安通报', '行政调查', '纪委监察'].includes(sourceType)) return 1
  if (sourceType === '网民原始内容') return 2
  if (['当事方材料', '机构原始材料', '新华社报道'].includes(sourceType)) return 3
  if (['调查报道', '媒体报道'].includes(sourceType)) return 4
  return source.url ? 5 : 5
}

function inferSourceRole(sourceType: SourceType): SourceRole {
  if (sourceType === '网民原始内容') return '公众讨论'
  if (sourceType === '当事方材料') return '当事说法'
  if (['媒体报道', '调查报道', '门户转载', '自媒体'].includes(sourceType)) return '历史报道'
  if (sourceType === '其他') return '线索'
  return '事实依据'
}

function normalizeSources(eventId: string, sources: RawEvent['sources']): SourceRecord[] {
  return sources.map((source, index) => {
    const sourceType = source.sourceType ?? inferSourceType(source)
    return {
      ...source,
      id: source.id ?? `${eventId}-source-${index + 1}`,
      sourceRank: source.sourceRank ?? inferSourceRank(source, sourceType),
      sourceType,
      sourceRole: source.sourceRole ?? inferSourceRole(sourceType),
      archiveStatus: source.archiveStatus ?? (source.url ? '在线' : '待补证'),
    }
  }) as SourceRecord[]
}

export const events: EventRecord[] = (rawEvents as unknown as RawEvent[])
  .map((rawEvent) => {
    const event = { ...rawEvent, ...(editorialDetails[rawEvent.title] ?? {}), ...(researchById[rawEvent.id] ?? {}) }
    const progress = progressById[rawEvent.id] ?? { status: 'untouched' as const, completeness: 20 }
    return { ...event, caseId: caseIdByEventId[event.id], sources: normalizeSources(event.id, event.sources), researchStatus: progress.status, completeness: progress.completeness } as EventRecord
  })
  .sort((a, b) => b.year - a.year || a.archiveCode.localeCompare(b.archiveCode))

export const chronologicalEvents = [...events].sort(
  (a, b) => a.year - b.year || a.archiveCode.localeCompare(b.archiveCode),
)

export const years = Array.from(new Set(events.map((event) => event.year))).sort((a, b) => a - b)
export const allTags = Array.from(new Set(events.flatMap((event) => event.tags))).sort()
export const subjectTypes = Array.from(new Set(events.map((event) => event.subjectType))).sort()

export function getEventById(id?: string) {
  return events.find((event) => event.id === id)
}

export function getEventsByCategory(category: Category) {
  return events.filter((event) => event.category === category)
}

export function getEventsByYear(year: number) {
  return events.filter((event) => event.year === year)
}

export function normalizeSearch(value: string) {
  return value.toLocaleLowerCase('zh-CN').replace(/[\s·“”‘’《》「」]/g, '')
}

export function eventSearchText(event: EventRecord) {
  return normalizeSearch([
    event.title,
    event.year,
    event.category,
    event.severity,
    event.evidenceLevel,
    event.evidenceBasis,
    event.subjectType,
    ...event.tags,
    ...event.subjects,
    event.summary,
    event.historicalMeaning,
    event.initialNarrative,
    event.publicQuestion,
    event.investigation,
    ...(event.verifiedFacts ?? []),
    ...(event.disputedClaims ?? []),
    ...(event.debunkedClaims ?? []),
  ].join(' '))
}

export function searchEvents(query: string) {
  const normalized = normalizeSearch(query)
  if (!normalized) return events
  return events.filter((event) => eventSearchText(event).includes(normalized))
}

export function getRandomEvent(excludeId?: string) {
  const pool = excludeId ? events.filter((event) => event.id !== excludeId) : events
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getRelatedEvents(event: EventRecord, limit = 4) {
  return events
    .filter((candidate) => candidate.id !== event.id)
    .map((candidate) => ({
      event: candidate,
      score:
        (candidate.category === event.category ? 4 : 0) +
        (candidate.year === event.year ? 2 : 0) +
        candidate.tags.filter((tag) => event.tags.includes(tag)).length * 3,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.event.year - a.event.year)
    .slice(0, limit)
    .map(({ event: related }) => related)
}

export function getSameCaseEvents(event: EventRecord) {
  if (!event.caseId) return []
  const caseLink = caseLinkById[event.caseId]
  if (!caseLink) return []
  return caseLink.eventIds
    .filter((eventId) => eventId !== event.id)
    .map((eventId) => getEventById(eventId))
    .filter((candidate): candidate is EventRecord => Boolean(candidate))
}
