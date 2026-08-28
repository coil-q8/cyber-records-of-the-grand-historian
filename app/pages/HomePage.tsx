import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categories } from '../../data/categories'
import { events, getEventsByCategory } from '../../lib/events'
import { EventCard } from '../../components/EventCard'
import { RandomHistoryButton } from '../../components/RandomHistoryButton'
import { SectionHeading } from '../../components/SectionHeading'
import { TimelineRail } from '../../components/TimelineRail'

const featuredTitles = [
  '魏则西事件与搜索医疗推广',
  '丰县“八孩女子”事件',
  '杭州取快递女子被造黄谣',
  '“猫一杯”巴黎秦朗寒假作业造假',
  '江西“鼠头鸭脖”事件',
  '北邮15名研究生联名举报导师郑某',
]

export function HomePage() {
  const featured = featuredTitles.map((title) => events.find((event) => event.title === title)).filter(Boolean) as typeof events
  const dayIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000)
  const todayEvent = events[dayIndex % events.length]

  return (
    <>
      <section className="home-hero archive-grid">
        <div className="home-hero__year-stream" aria-hidden="true"><span>2016</span><span>2020</span><span>2026</span></div>
        <div className="home-hero__inner page-shell">
          <motion.div className="home-hero__kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
            <span>CYBER SHIJI ARCHIVE</span><span>卷宗 0001—0142</span><span>资料截止 2026.08.15</span>
          </motion.div>
          <motion.div className="home-hero__title" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.72, delay: 0.08 }}>
            <div className="hero-seal" aria-hidden="true">记</div>
            <h1><span>赛博</span><span>史记</span></h1>
            <strong>2016—2026</strong>
            <div className="home-hero__byline" aria-label="AFlish_Lee 撰"><span>AFlish_Lee</span>{' '}<em>撰</em></div>
          </motion.div>
          <motion.div className="home-hero__manifesto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35, duration: 0.8 }}>
            <p>互联网不会真正忘记。</p><p>但人会。</p>
            <blockquote>此书记其荒诞，录其恶行，存其公议，以俟后来。</blockquote>
          </motion.div>
          <div className="home-hero__actions"><Link className="button button--primary" to="/archive"><Search size={17} /> 检索档案</Link><RandomHistoryButton /></div>
          <div className="hero-principles">
            <span>纪其始末</span><span>列其异说</span><span>考其证据</span>
          </div>
          <a className="scroll-cue" href="#volumes"><ArrowDown size={16} />下行入卷</a>
        </div>
      </section>

      <section className="principle-strip"><nav className="chronicle-index page-shell" aria-label="史记体卷目"><Link to="/timeline"><strong>本纪</strong><span>十年主线</span></Link><Link to="/volumes"><strong>世家</strong><span>五卷门类</span></Link><Link to="/archive"><strong>列传</strong><span>人物与个案</span></Link><Link to="/statistics"><strong>表</strong><span>年代与分布</span></Link><Link to="/insights"><strong>书</strong><span>机制与制度</span></Link><Link to="/archive"><strong>索隐</strong><span>检索与互见</span></Link></nav></section>

      <section className="section page-shell" id="volumes">
        <SectionHeading eyebrow="THE FIVE VOLUMES / 五卷" title="五卷分纪，照见十年" description="文学分部不是法律罪名。每一卷保存一种反复出现的公共机制。" aside={<Link className="text-link" to="/volumes">查看卷目 <ArrowRight size={15} /></Link>} />
        <div className="volume-grid">
          {categories.map((category, index) => (
            <motion.div key={category.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ delay: index * 0.06 }}>
              <Link className="volume-card" to={`/volume/${category.name}`} style={{ '--category-color': category.color } as React.CSSProperties}>
                <div className="volume-card__top"><span>{category.number}</span><span>{category.code}</span></div>
                <div className="volume-card__seal">{category.seal}</div>
                <h3>{category.name}</h3>
                <strong>{getEventsByCategory(category.name).length}<small> 条档案</small></strong>
                <p>{category.definition}</p>
                <span className="volume-card__open">开卷 <ArrowRight size={16} /></span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section section--ink-wash">
        <div className="page-shell">
          <SectionHeading eyebrow="2016—2026 / TIMELINE" title="十年时间长河" description="密度不是罪恶指数，只显示文档在该年收录的事件数量。" aside={<Link className="text-link" to="/timeline">展开全卷 <ArrowRight size={15} /></Link>} />
          <TimelineRail />
        </div>
      </section>

      <section className="section page-shell">
        <SectionHeading eyebrow="SELECTED RECORDS / 重案选录" title="此十年，不可忘者" description="从普通人、学校、网络摆拍、媒体失真、治理与导师权力中各取其一。" />
        <div className="featured-grid">{featured.map((event, index) => <EventCard key={event.id} event={event} index={index} />)}</div>
      </section>

      <section className="section page-shell home-today">
        <div className="today-record">
          <span className="eyebrow">今日旧闻 / ON THIS ARCHIVE DAY</span>
          <div className="today-record__body"><div><span className="today-record__date">{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}</span><small>原稿多数条目未载月日，故按今日序号轮值一则旧闻，不虚构纪念日。</small></div><div><span>{todayEvent.year} · {todayEvent.category}</span><h2>{todayEvent.title}</h2><p>{todayEvent.summary}</p><Link className="text-link" to={`/event/${todayEvent.id}`}>进入档案 <ArrowRight size={15} /></Link></div></div>
        </div>
        <div className="random-panel"><span className="random-panel__seal">鉴</span><span className="eyebrow">RANDOM ARCHIVE</span><h2>不知道从何读起？</h2><p>让档案随机打开。每次选择都从 142 条真实数据中产生。</p><RandomHistoryButton /></div>
      </section>

      <section className="section page-shell home-insight">
        <div><span className="eyebrow">THE MECHANISMS / 十年之鉴</span><h2>事件会过去，机制会重演</h2><p>造神链、愤怒变现链、网络私刑链、机构自保链、平台权力链、信息真空链、纠错不对称与导师老板化链。</p><Link className="button button--ghost" to="/insights">阅读八种结构 <ArrowRight size={16} /></Link></div>
        <div className="mechanism-preview" aria-hidden="true"><span>真实故事</span><i /><span>删除限定词</span><i /><span>平台推荐</span><i /><span>标签固化</span></div>
      </section>
    </>
  )
}
