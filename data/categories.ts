import type { Category, EvidenceLevel, Severity } from '../types/event'

export interface CategoryMeta {
  name: Category
  number: string
  code: string
  seal: string
  definition: string
  scope: string
  color: string
}

export const categories: CategoryMeta[] = [
  {
    name: '恶企', number: '卷一', code: 'ENTERPRISE', seal: '企', color: '#b58a52',
    definition: '平台、品牌、供应链与资本失守',
    scope: '记录企业、平台、品牌及其供应链中被公开调查、处罚或形成重大公共争议的事件。',
  },
  {
    name: '庸策', number: '卷二', code: 'GOVERNANCE', seal: '策', color: '#799b92',
    definition: '不作为、瞒报、层层加码与程序失灵',
    scope: '记录公共机构、监管、执法和政策执行中的失灵，不对所有执行人员作道德推定。',
  },
  {
    name: '奸人', number: '卷三', code: 'MANIPULATION', seal: '奸', color: '#9c5c55',
    definition: '造谣、摆拍、网暴、人设与流量套利',
    scope: '记录主动借网络造假、摆拍、造谣、网暴、人设包装等获取流量、利益或伤害他人的行为。',
  },
  {
    name: '丑角', number: '卷四', code: 'SPECTACLE', seal: '角', color: '#7e748d',
    definition: '被造神者、被误伤者与时代迷因',
    scope: '记录被造神、被污名、失言翻车或成为时代迷因的人物与事件；被记载不等于有罪。',
  },
  {
    name: '桀师', number: '卷五', code: 'ACADEMIC POWER', seal: '师', color: '#9c765b',
    definition: '导学权力、学生压迫与科研劳动剥夺',
    scope: '记录利用导学权力侵害学生劳动、署名、经费、毕业、人格与安全权益的事件。',
  },
]

export const severityDescriptions: Record<Severity, string> = {
  S: '严重生命、人身或制度性损害',
  A: '明确欺骗、滥权或广泛伤害',
  B: '重大伦理、传播或营销失范',
  C: '荒诞、失德或有限现实伤害',
  D: '低危害，主要保存时代记忆',
}

export const evidenceDescriptions: Record<EvidenceLevel, string> = {
  司法定案: '已有法院裁判或明确司法结论。',
  官方调查: '已有公安、监管、政府、学校等正式调查或处置。',
  当事人承认: '核心事实得到当事方公开承认。',
  多方证实: '多份较可靠公开资料可以相互支持。',
  强争议: '存在官方确认的部分事实，但关键指控或因果仍有争议。',
  未核实: '缺少足够独立证据，不能把网络说法写成事实。',
}
