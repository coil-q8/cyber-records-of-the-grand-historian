export interface CaseLink {
  id: string
  title: string
  eventIds: string[]
}

// “同案”只连接同一现实事件的不同编纂角度，不把相似议题或同类舆情强行合并。
export const caseLinks: CaseLink[] = [
  { id: 'case-weizexi-2016', title: '魏则西医疗推广案', eventIds: ['cyber-2016-eq-002', 'cyber-2016-yc-001'] },
  { id: 'case-changsheng-vaccine-2018', title: '长春长生问题疫苗案', eventIds: ['cyber-2018-eq-007', 'cyber-2018-yc-003'] },
  { id: 'case-water-hydrogen-2019', title: '南阳水氢汽车风波', eventIds: ['cyber-2019-eq-044', 'cyber-2019-yc-019'] },
  { id: 'case-sichuan-metro-2023', title: '四川大学地铁指控事件', eventIds: ['cyber-2023-yc-026', 'cyber-2023-jr-019'] },
  { id: 'case-arctic-catfish-2023', title: '北极鲶鱼炫富事件', eventIds: ['cyber-2023-jr-032', 'cyber-2023-cj-005'] },
  { id: 'case-chongqing-gas-2024', title: '重庆燃气计费争议', eventIds: ['cyber-2024-eq-037', 'cyber-2024-yc-027'] },
  { id: 'case-pangmao-2024', title: '胖猫网络争议', eventIds: ['cyber-2024-jr-007', 'cyber-2024-cj-002'] },
  { id: 'case-tanker-oil-2024', title: '罐车混运食用油事件', eventIds: ['cyber-2024-eq-017', 'cyber-2024-yc-016'] },
  { id: 'case-cat-cup-2024', title: '巴黎秦朗寒假作业造假', eventIds: ['cyber-2024-jr-006', 'cyber-2024-cj-008'] },
  { id: 'case-wuhan-library-2023', title: '武汉大学图书馆事件', eventIds: ['cyber-2025-yc-017', 'cyber-2025-jr-011'] },
  { id: 'case-ai-poverty-persona-2025', title: 'AI与摆拍卖惨人设', eventIds: ['cyber-2025-jr-024', 'cyber-2025-cj-010'] },
  { id: 'case-turbine-teen-2026', title: '十四岁涡喷模型少年传播争议', eventIds: ['cyber-2026-jr-035', 'cyber-2026-cj-011'] },
]

export const caseIdByEventId = Object.fromEntries(
  caseLinks.flatMap((caseLink) => caseLink.eventIds.map((eventId) => [eventId, caseLink.id])),
) as Record<string, string>

export const caseLinkById = Object.fromEntries(caseLinks.map((caseLink) => [caseLink.id, caseLink])) as Record<string, CaseLink>
