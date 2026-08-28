import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div><Logo /><p>记互联网之荒诞，存数字时代之公议。</p></div>
        <div><span className="eyebrow">编纂凡例</span><p>网友的质疑决定是否值得入史，证据决定可以写到哪一步。</p></div>
        <div className="site-footer__links"><Link to="/about">编纂说明</Link><Link to="/archive">档案索引</Link><Link to="/statistics">十年表</Link><Link to="/graph">关系索引</Link><Link to="/favorites">我的私档</Link></div>
      </div>
      <div className="site-footer__bottom"><span>《赛博史记》· 二〇一六至二〇二六</span><span>资料截止 2026.08.15</span></div>
    </footer>
  )
}
