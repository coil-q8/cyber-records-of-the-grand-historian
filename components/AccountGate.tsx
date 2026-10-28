import { Link, useLocation } from 'react-router-dom'
import type { ReturnTypeOfAccount } from '../lib/community-helpers'

export function AccountGate({ account, admin = false }: { account: ReturnTypeOfAccount; admin?: boolean }) {
  const location = useLocation()
  return <section className="section page-shell"><div className="account-panel account-gate">
    {account.loading ? <p role="status">正在确认登录状态……</p> : account.error ? <><h2>暂时无法连接账号服务</h2><p role="alert">{account.error}</p><button className="button" onClick={() => void account.refresh()}>重新连接</button></> : account.session.user && admin ? <><h2>此处为管理员审稿台</h2><p>当前账号没有审核权限。</p><Link className="button" to="/account">返回我的账号</Link></> : <><h2>登录后，续写一篇</h2><p>草稿、投稿进度和审核意见会保存在你的账号中。</p><Link className="button" to={`/account?next=${encodeURIComponent(location.pathname)}`}>登录或注册</Link></>}
  </div></section>
}
