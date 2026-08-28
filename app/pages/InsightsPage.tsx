import { ArrowDown } from 'lucide-react'
import { PageHero } from '../../components/PageHero'

const mechanisms = [
  { number: '一', title: '造神链', nodes: ['真实的小成绩或故事', '删除限定条件', '媒体包装', '平台算法推荐', '天才 / 英雄 / 恶人标签固化'], examples: '姜萍、涡喷少年、千万行代码争议' },
  { number: '二', title: '愤怒变现链', nodes: ['虚构冲突', '激怒网民', '获取曝光', '涨粉', '直播 / 课程 / 商品变现'], examples: '猫一杯、外卖员摆拍、卖惨账号' },
  { number: '三', title: '网络私刑链', nodes: ['单方爆料', '挂人', '隐私暴露', '营销号搬运', '全民审判', '反转也难恢复名誉'], examples: '取快递造谣、偷拍误会、武汉大学事件' },
  { number: '四', title: '机构自保链', nodes: ['基层先否认或淡化', '公众拿出更多线索', '上级调查', '原回应被推翻'], examples: '鼠头鸭脖' },
  { number: '五', title: '平台权力链', nodes: ['制定规则', '掌握流量', '抽取交易佣金', '商户 / 骑手 / 用户失去议价权'], examples: '平台垄断、算法管理、搜索排序' },
  { number: '六', title: '信息真空链', nodes: ['可靠信息缺位', '自媒体给出“完整解释”', '阴谋论占领认知', '后续事实追不上传播'], examples: '胡鑫宇、成都四十九中' },
  { number: '七', title: '纠错不对称', nodes: ['错误标题瞬时扩散', '事实核查耗时', '数月或数年后更正', '澄清传播远低于原叙事'], examples: '多起反转新闻与公开指控事件' },
  { number: '八', title: '导师“老板化”链', nodes: ['导师掌握课题 / 署名 / 毕业', '学生难以拒绝', '申诉担忧学业报复', '多人联名或伤亡曝光', '学校调查'], examples: '北邮、人大、西交、武汉理工、南邮等记录' },
]

export function InsightsPage() {
  return <><PageHero eyebrow="HISTORICAL MODE / 附论" title="十年之鉴" description="单个热搜容易被遗忘，重复出现的结构更值得保存。以下八种机制均来自原始文档附论。" meta={<span>8 RECURRING MECHANISMS</span>} /><section className="section page-shell mechanisms">{mechanisms.map((item, index) => <article key={item.title} className="mechanism"><div className="mechanism__number"><span>{item.number}</span><small>{String(index + 1).padStart(2, '0')}</small></div><div className="mechanism__content"><span>RECURRING STRUCTURE</span><h2>{item.title}</h2><div className="mechanism__flow">{item.nodes.map((node, nodeIndex) => <div key={node}><b>{node}</b>{nodeIndex < item.nodes.length - 1 && <ArrowDown />}</div>)}</div><p><strong>可参照：</strong>{item.examples}</p></div></article>)}</section><section className="insight-conclusion page-shell"><span>史鉴</span><blockquote>错误标题可能一小时破亿阅读；更正、撤稿、判决往往在数月或数年后到来。互联网没有天然的“名誉恢复键”。</blockquote></section></>
}
