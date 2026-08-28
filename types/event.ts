export type Category = '恶企' | '庸策' | '奸人' | '丑角' | '桀师'
export type Severity = 'S' | 'A' | 'B' | 'C' | 'D'
export type EvidenceLevel = '司法定案' | '官方调查' | '当事人承认' | '多方证实' | '强争议' | '未核实'
export type SourceRank = 1 | 2 | 3 | 4 | 5
export type SourceType = '司法文书' | '公安通报' | '行政调查' | '行政处罚' | '纪委监察' | '网民原始内容' | '当事方材料' | '机构原始材料' | '新华社报道' | '调查报道' | '媒体报道' | '门户转载' | '自媒体' | '其他'
export type SourceRole = '事实依据' | '当事说法' | '调查过程' | '处理结果' | '机构回应' | '制度回应' | '公众讨论' | '传播链证据' | '技术背景' | '历史报道' | '线索'
export type ArchiveStatus = '在线' | '已删除' | '已失效' | '链接失效' | '仅存截图' | '仅存转载' | '已有网页存档' | '待补证'
export type ResearchStatus = 'untouched' | 'researching' | 'researched' | 'needs-review' | 'disputed'
export type FolkEvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type FolkVerificationStatus = '已核验' | '交叉印证' | '未独立核实' | '传播记录' | '已证伪'

export interface SourceRecord {
  id: string
  title: string
  institution: string
  date: string
  url: string | null
  note?: string | null
  sourceRank: SourceRank
  sourceType: SourceType
  sourceRole: SourceRole
  archiveStatus: ArchiveStatus
}

export interface TimelineEntry {
  date: string
  title: string
  description: string
  sourceIds?: string[]
}

export interface PublicCommentRecord {
  text: string
  quoteType: '原话' | '概述'
  platform: string
  date?: string
  author?: string
  url?: string | null
  context: string
  laterStatus?: string
  evidenceGrade?: FolkEvidenceGrade
  verificationStatus?: FolkVerificationStatus
  originType?: '首发' | '回复' | '楼中楼' | '转发' | '存档'
  sourceId?: string
  independentVerification?: string
  engagement?: {
    likes?: number
    replies?: number
    capturedAt?: string
  }
}

export interface PropagationEntry {
  stage: string
  title: string
  description: string
  sourceIds?: string[]
}

export interface ContentBlock {
  type: 'paragraph' | 'heading' | 'quote' | 'fact'
  text: string
  sourceIds?: string[]
}

export interface EventRecord {
  id: string
  caseId?: string
  archiveCode: string
  title: string
  year: number
  date: string
  category: Category
  severity: Severity
  evidenceLevel: EvidenceLevel
  evidenceBasis: string
  status: string
  subjectType: string
  subjects: string[]
  tags: string[]
  summary: string
  historicalMeaning: string
  sources: SourceRecord[]
  featured: boolean
  initialNarrative?: string
  publicQuestion?: string
  mediaRole?: string
  investigation?: string
  finalConclusion?: string
  historianNote?: string
  verifiedFacts?: string[]
  disputedClaims?: string[]
  debunkedClaims?: string[]
  unresolvedQuestions?: string[]
  timeline?: TimelineEntry[]
  publicComments?: PublicCommentRecord[]
  propagationChain?: PropagationEntry[]
  contentBlocks?: ContentBlock[]
  sectionSources?: Record<string, string[]>
  researchStatus: ResearchStatus
  completeness: number
}
