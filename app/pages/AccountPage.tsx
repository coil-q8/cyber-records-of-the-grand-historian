import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Download, LogOut, PenLine, ShieldCheck } from 'lucide-react'
import { PageHero } from '../../components/PageHero'
import { useAccount, api, errorMessage } from '../../lib/account'
import { formatDateTime } from '../../lib/community-helpers'
import { submissionLabels, PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, type SessionInfo, type Submission } from '../../types/community'

export function AccountPage({ setup = false }: { setup?: boolean }) {
  const account = useAccount(), navigate = useNavigate(), [params, setParams] = useSearchParams()
  const mode = setup ? 'setup' : params.get('mode') === 'register' ? 'register' : params.get('mode') === 'recover' ? 'recover' : 'login'
  const [setupToken] = useState(() => setup ? new URLSearchParams(window.location.hash.slice(1)).get('setup') ?? '' : '')
  const [name, setName] = useState(setup ? 'aflish_lee' : ''), [displayName, setDisplayName] = useState(setup ? 'AFlish_Lee' : '')
  const [pass, setPass] = useState(''), [repeat, setRepeat] = useState(''), [recovery, setRecovery] = useState(''), [oldPass, setOldPass] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [recoveryCode, setRecoveryCode] = useState(''), [items, setItems] = useState<Submission[]>([]), [listError, setListError] = useState(''), [listLoading, setListLoading] = useState(false), [changePassword, setChangePassword] = useState(false), [reload, setReload] = useState(0)
  useEffect(() => { if (setup && window.location.hash) window.history.replaceState(null, '', window.location.pathname + window.location.search) }, [setup])
  useEffect(() => { setError(''); setPass(''); setRepeat(''); setRecovery('') }, [mode])
  useEffect(() => {
    if (!account.session.user) { setItems([]); return }
    const controller = new AbortController(); setListLoading(true); setListError('')
    api<{ items: Submission[] }>('/api/my/submissions', 'GET', undefined, undefined, controller.signal).then((result) => setItems(result.items)).catch((error) => { if (!controller.signal.aborted) setListError(errorMessage(error)) }).finally(() => { if (!controller.signal.aborted) setListLoading(false) })
    return () => controller.abort()
  }, [account.session.user?.id, reload])
  function destination() { const next = params.get('next'); return next && /^\/(?:write|admin)(?:\/|$)/u.test(next) ? next : '/account' }
  async function authenticate(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (mode !== 'login' && pass !== repeat) throw new Error('两次输入的密码不一致。')
      if (mode === 'setup' && !setupToken) throw new Error('请使用网站所有者持有的一次性激活链接。')
      const result = await api<SessionInfo & { recoveryCode?: string }>(`/api/auth/${mode === 'setup' ? 'setup' : mode}`, 'POST', { username: name, displayName, password: pass, newPassword: pass, recoveryCode: recovery, setupToken })
      account.adopt(result); setPass(''); setRepeat(''); setRecovery('')
      if (result.recoveryCode) setRecoveryCode(result.recoveryCode)
      else navigate(destination(), { replace: true })
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  async function updatePassword(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (pass !== repeat) throw new Error('两次输入的密码不一致。')
      const result = await api<SessionInfo & { recoveryCode: string }>('/api/auth/password', 'POST', { oldPassword: oldPass, newPassword: pass }, account.session.csrfToken)
      account.adopt(result); setRecoveryCode(result.recoveryCode); setOldPass(''); setPass(''); setRepeat(''); setChangePassword(false)
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  function downloadRecovery() {
    const blobUrl = URL.createObjectURL(new Blob([`赛博史记账号恢复码\n账号：${account.session.user?.username}\n恢复码：${recoveryCode}\n\n仅显示一次。请保存在安全处；使用后会失效。\n网站：${window.location.origin}\n`], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = blobUrl; link.download = 'cyber-records-recovery.txt'; link.click(); window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  }
  const signedIn = !!account.session.user && (!setup || account.session.user.role === 'admin' || !!recoveryCode)
  return <>
    <PageHero eyebrow="THE WRITING DESK / 共撰史记" title={setup ? '开馆授印' : '我的账号'} description="留下自己的记录，让事实与出处一同进入讨论。投稿经管理员审核后公开。" />
    <section className="section page-shell account-page">
      {account.loading && <p role="status">正在确认登录状态……</p>}
      {account.error && <div className="community-error" role="alert">{account.error}<button onClick={() => void account.refresh()}>重新连接</button></div>}
      {recoveryCode && <div className="account-recovery" role="status"><ShieldCheck size={25} /><h2>请保存你的账号恢复码</h2><p>忘记密码时可用它重设密码。此码仅显示一次，新恢复码生成后旧码失效，请勿与他人共享。</p><code data-testid="recovery-code">{recoveryCode}</code><div className="account-actions"><button className="button" onClick={downloadRecovery}><Download size={16} />下载恢复码</button><button className="button button--ghost" onClick={() => { setRecoveryCode(''); navigate(setup ? '/admin' : destination(), { replace: true }) }}>已保存，继续 <ArrowRight size={16} /></button></div></div>}
      {!signedIn && !account.loading && <div className="account-panel auth-panel">
        {!setup && <div className="account-tabs">{[['login', '登录'], ['register', '注册'], ['recover', '找回账号']].map(([value, label]) => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setParams((previous) => { const next = new URLSearchParams(previous); next.set('mode', value); return next })}>{label}</button>)}</div>}
        <h2>{mode === 'login' ? '重回案几' : mode === 'register' ? '留一方署名' : mode === 'recover' ? '使用恢复码重设密码' : '激活管理员账号'}</h2>
        {setup && <p>此入口仅供网站所有者使用。激活后，可在审稿台处理用户投稿。</p>}
        <form onSubmit={authenticate} className="community-form">
          <label>账号名<input aria-label="账号名" value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" /><small>3—32位字母、数字或下划线，以字母开头。登录时不区分大小写。</small></label>
          {(mode === 'register' || mode === 'setup') && <label>公开署名<input aria-label="公开署名" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={40} required autoComplete="nickname" /><small>通过审核的文章会公开显示此署名。</small></label>}
          {mode === 'recover' && <label>账号恢复码<input aria-label="账号恢复码" value={recovery} onChange={(event) => setRecovery(event.target.value)} required autoComplete="off" spellCheck={false} /></label>}
          <label>{mode === 'recover' ? '新密码' : '密码'}<input aria-label={mode === 'recover' ? '新密码' : '密码'} type="password" value={pass} onChange={(event) => setPass(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /><small>至少{PASSWORD_MIN_LENGTH}个字符。</small></label>
          {mode !== 'login' && <label>再次输入密码<input aria-label="再次输入密码" type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button" disabled={busy} type="submit">{busy ? '正在处理……' : mode === 'login' ? '登录账号' : mode === 'register' ? '创建账号' : mode === 'recover' ? '重设密码' : '激活管理员'}</button>
        </form>
      </div>}
      {signedIn && !account.loading && <>
        <div className="account-banner"><div><span className="eyebrow">{account.session.user!.role === 'admin' ? '管理员' : '撰稿人'}</span><h2>{account.session.user!.displayName}</h2><p>@{account.session.user!.username} · 草稿与待审内容仅向作者和管理员开放。</p></div><div className="account-actions"><Link className="button" to="/write"><PenLine size={16} />写一篇</Link>{account.session.user!.role === 'admin' && <Link className="button button--ghost" to="/admin">进入审稿台</Link>}<button className="button button--ghost" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await account.logout(); navigate('/account', { replace: true }) } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) } }}><LogOut size={16} />退出</button></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="community-section-head"><h2>我的稿件 <small>{items.length}</small></h2><button className="text-link" onClick={() => setReload((value) => value + 1)}>刷新列表 ↻</button></div>
        {listLoading ? <p role="status">正在取回稿件……</p> : listError ? <p role="alert">{listError}</p> : !items.length ? <div className="community-empty"><h3>第一篇，尚待落笔</h3><p>可以先保存草稿，补齐正文与史料后再提交审核。</p><Link className="text-link" to="/write">开始撰写 <ArrowRight size={16} /></Link></div> : <div className="submission-list">{items.map((item) => <article key={item.id}><div><span className={`submission-status submission-status--${item.status}`}>{submissionLabels[item.status]}</span>{item.publishedVersion && <span className="community-public-note">已有公开版本 v{item.publishedVersion}</span>}<h3><Link to={`/write/${item.id}`}>{item.title || '未题名草稿'}</Link></h3><small>更新 {formatDateTime(item.updatedAt)} · 稿件 v{item.version}</small>{item.reviewNote && <p>审核意见：{item.reviewNote}</p>}</div><Link className="text-link" to={`/write/${item.id}`}>{item.status === 'pending' ? '查看投稿' : '打开稿件'} <ArrowRight size={16} /></Link></article>)}</div>}
        <section className="account-security"><button className="text-link" onClick={() => { setChangePassword(!changePassword); setPass(''); setRepeat(''); setError('') }}>修改密码 {changePassword ? '−' : '+'}</button>{changePassword && <form className="community-form" onSubmit={updatePassword}><label>原密码<input aria-label="原密码" type="password" value={oldPass} onChange={(event) => setOldPass(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="current-password" /></label><label>新密码<input aria-label="新密码" type="password" value={pass} onChange={(event) => setPass(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" /></label><label>再次输入密码<input aria-label="再次输入密码" type="password" value={repeat} onChange={(event) => setRepeat(event.target.value)} required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" /></label><p>修改后会退出其他登录，并重新生成恢复码。</p><button className="button" type="submit" disabled={busy}>保存新密码</button></form>}</section>
      </>}
    </section>
  </>
}
