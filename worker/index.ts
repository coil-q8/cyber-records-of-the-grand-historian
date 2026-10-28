import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto'
import type { Account, ArticleInput, SessionInfo, SubmissionStatus } from '../types/community'
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '../types/community'

interface Env { DB: D1Database; ASSETS: Fetcher; PUBLIC_ORIGIN: string }
interface UserRow { id: string; username: string; display_name: string; role: 'member' | 'admin'; password_hash: string; recovery_hash: string; disabled: number }
interface SubmissionRow {
  id: string; author_id: string; author_name: string; title: string; category: string; event_date: string; summary: string; body: string
  sources_json: string; tags_json: string; status: SubmissionStatus; version: number; review_note: string; created_at: string
  updated_at: string; submitted_at: string | null; reviewed_at: string | null; published_version: number | null
}
type LoginSession = { user: Account; csrfToken: string; tokenHash: string }
class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
const categories = ['恶企', '庸策', '奸人', '丑角', '桀师']
const now = () => new Date().toISOString()
const seconds = () => Math.floor(Date.now() / 1000)
const random = () => randomBytes(32).toString('base64url')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const equal = (a: string, b: string) => { const left = Buffer.from(a), right = Buffer.from(b); return left.length === right.length && timingSafeEqual(left, right) }
function fail(status: number, message: string): never { throw new HttpError(status, message) }
function json(value: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', ...headers } })
}
function local(request: Request) { return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname) }
function cookieName(request: Request) { return local(request) ? 'cyber_session' : '__Host-cyber_session' }
function cookie(request: Request, token: string, maxAge = 604800) {
  return `${cookieName(request)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${local(request) ? '' : '; Secure'}`
}
function assertOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin')
  let allowed = origin === env.PUBLIC_ORIGIN
  if (local(request) && origin) {
    try { allowed = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname) } catch { allowed = false }
  }
  if (!origin || !allowed || request.headers.get('Sec-Fetch-Site') === 'cross-site') fail(403, '请求来源不受允许，请从本站重新操作。')
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) fail(415, '请使用 JSON 提交。')
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (Number(request.headers.get('Content-Length') ?? 0) > 240000) fail(413, '提交内容过长。')
  if (!request.body) fail(400, '缺少提交内容。')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 240000) { await reader.cancel(); fail(413, '提交内容过长。') }
      chunks.push(part.value)
    }
    const buffer = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer))
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, '提交格式有误。')
    return value as Record<string, unknown>
  } catch (error) { if (error instanceof HttpError) throw error; fail(400, '提交格式有误。') }
}
function text(value: unknown, name: string, max: number, min = 0) {
  if (typeof value !== 'string') fail(400, `${name}格式有误。`)
  const result = value.trim()
  if (result.length < min || result.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result)) fail(400, `${name}需要 ${min}—${max} 个字符。`)
  return result
}
function username(value: unknown) {
  const name = text(value, '账号名', 32, 3).toLowerCase()
  if (!/^[a-z][a-z0-9_]{2,31}$/u.test(name)) fail(400, '账号名以字母开头，使用3—32位字母、数字或下划线。')
  return name
}
function password(value: unknown) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) fail(400, `密码需要${PASSWORD_MIN_LENGTH}—${PASSWORD_MAX_LENGTH}个字符。`)
  return value
}
async function derive(value: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => scrypt(value, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)))
}
async function passwordHash(value: string) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt-32768-8-3$${salt}$${(await derive(value, salt)).toString('hex')}`
}
async function verifyPassword(value: string, encoded: string) {
  const [algorithm, salt, expected] = encoded.split('$')
  if (algorithm !== 'scrypt-32768-8-3' || !/^[a-f0-9]{32}$/u.test(salt ?? '') || !/^[a-f0-9]{64}$/u.test(expected ?? '')) return false
  return equal((await derive(value, salt)).toString('hex'), expected)
}
function publicUser(row: UserRow): Account { return { id: row.id, username: row.username, displayName: row.display_name, role: row.role } }
async function rate(request: Request, env: Env, scope: string, limit: number, period = 900, identity?: string) {
  const start = Math.floor(seconds() / period) * period
  const key = hash(`${scope}:${identity ?? request.headers.get('CF-Connecting-IP') ?? 'local'}:${start}`)
  const row = await env.DB.prepare('INSERT INTO rate_limits (key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits').bind(key, start + period).first<{ hits: number }>()
  if (row && row.hits > limit) fail(429, '操作过于频繁，请稍后再试。')
}
async function session(request: Request, env: Env, required = true): Promise<LoginSession | null> {
  const raw = (request.headers.get('Cookie') ?? '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${cookieName(request)}=`))?.split('=')[1]
  if (!raw || !/^[a-zA-Z0-9_-]{43}$/u.test(raw)) { if (required) fail(401, '请先登录。'); return null }
  const tokenHash = hash(raw)
  const row = await env.DB.prepare('SELECT a.*,s.csrf_token FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.disabled=0').bind(tokenHash, seconds()).first<UserRow & { csrf_token: string }>()
  if (!row) { if (required) fail(401, '登录已过期，请重新登录。'); return null }
  return { user: publicUser(row), csrfToken: row.csrf_token, tokenHash }
}
async function authorize(request: Request, env: Env, admin = false) {
  const current = (await session(request, env))!
  if (admin && current.user.role !== 'admin') fail(403, '仅管理员可以审核。')
  if (!['GET', 'HEAD'].includes(request.method) && !equal(request.headers.get('X-CSRF-Token') ?? '', current.csrfToken)) fail(403, '登录校验失效，请刷新页面再试。')
  return current
}
async function newSession(request: Request, env: Env, user: Account, extra: Record<string, unknown> = {}) {
  const token = random(), csrfToken = random(), created = seconds()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(created),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<=?').bind(created),
    env.DB.prepare('INSERT INTO sessions (token_hash,account_id,csrf_token,expires_at,created_at) VALUES (?,?,?,?,?)').bind(hash(token), user.id, csrfToken, created + 604800, created),
  ])
  return json({ user, csrfToken, ...extra }, 200, { 'Set-Cookie': cookie(request, token) })
}
function articleInput(data: Record<string, unknown>): ArticleInput {
  const title = text(data.title, '标题', 120), summary = text(data.summary, '摘要', 600), prose = text(data.body, '正文', 50000)
  const category = text(data.category, '卷目', 10)
  if (!categories.includes(category)) fail(400, '请选择有效卷目。')
  const eventDate = text(data.eventDate, '事件日期', 10)
  if (eventDate && !/^\d{4}(?:-(?:0[1-9]|1[0-2]))?(?:-(?:0[1-9]|[12]\d|3[01]))?$/u.test(eventDate)) fail(400, '日期请使用 YYYY、YYYY-MM 或 YYYY-MM-DD。')
  if (eventDate.length === 10 && new Date(`${eventDate}T00:00:00Z`).toISOString().slice(0, 10) !== eventDate) fail(400, '事件日期不存在。')
  if (!Array.isArray(data.sources) || data.sources.length > 12) fail(400, '最多添加12则来源。')
  const sources = data.sources.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') fail(400, '来源格式有误。')
    const source = raw as Record<string, unknown>
    const title = text(source.title, '来源标题', 160, 1), url = text(source.url, '来源网址', 2000, 1)
    try { const parsed = new URL(url); if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(400, '来源仅支持无账号信息的 HTTP/HTTPS 链接。') } catch { fail(400, '来源网址无效。') }
    return { title, url }
  })
  if (!Array.isArray(data.tags) || data.tags.length > 8) fail(400, '标签最多8个。')
  const tags = [...new Set(data.tags.map((tag: unknown) => text(tag, '标签', 24, 1)))]
  return { title, category, eventDate, summary, body: prose, sources, tags }
}
function submitReady(row: SubmissionRow) {
  if (row.title.length < 5 || row.summary.length < 30 || row.body.length < 300 || !JSON.parse(row.sources_json).length) fail(400, '投稿需标题至少5字、摘要至少30字、正文至少300字，并提供至少1则可核查来源。')
}
function fields(input: ArticleInput) { return [input.title, input.category, input.eventDate, input.summary, input.body, JSON.stringify(input.sources), JSON.stringify(input.tags)] }
function article(row: SubmissionRow) {
  return { id: row.id, authorName: row.author_name, title: row.title, category: row.category, eventDate: row.event_date, summary: row.summary, body: row.body, sources: JSON.parse(row.sources_json), tags: JSON.parse(row.tags_json), version: row.version, publishedAt: (row as unknown as { published_at: string }).published_at, updatedAt: row.updated_at }
}
function submission(row: SubmissionRow) {
  return { ...article(row), authorId: row.author_id, status: row.status, reviewNote: row.review_note, createdAt: row.created_at, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at, publishedVersion: row.published_version }
}
const submissionSelect = 'SELECT s.*,a.display_name AS author_name,p.version AS published_version FROM submissions s JOIN accounts a ON a.id=s.author_id LEFT JOIN published_articles p ON p.id=s.id'
async function loadSubmission(env: Env, id: string, user: Account) {
  const row = await env.DB.prepare(`${submissionSelect} WHERE s.id=? AND (s.author_id=? OR ?='admin')`).bind(id, user.id, user.role).first<SubmissionRow>()
  if (!row) fail(404, '找不到这篇稿件。')
  return row
}
function version(data: Record<string, unknown>) { if (!Number.isSafeInteger(data.version) || Number(data.version) < 1) fail(400, '缺少稿件版本，请刷新重试。'); return Number(data.version) }
function changed(result: D1Result) { if (!result.meta.changes) fail(409, '稿件状态或版本已变化，请刷新后再操作。') }
async function api(request: Request, env: Env) {
  const url = new URL(request.url), path = url.pathname.replace(/\/$/u, ''), method = request.method
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method)) fail(405, '不支持此操作。')
  if (method !== 'GET') assertOrigin(request, env)
  if (path === '/api/health' && method === 'GET') { await env.DB.prepare('SELECT 1 FROM app_settings LIMIT 1').first(); return json({ ok: true }) }
  if (path === '/api/auth/session' && method === 'GET') {
    const current = await session(request, env, false)
    return json({ user: current?.user ?? null, csrfToken: current?.csrfToken ?? null } satisfies SessionInfo)
  }
  if (['/api/auth/register', '/api/auth/setup'].includes(path) && method === 'POST') {
    const setup = path.endsWith('/setup')
    await rate(request, env, setup ? 'setup' : 'register', setup ? 8 : 10, 3600)
    const data = await body(request), name = username(data.username), display = text(data.displayName, '署名', 40, 2), pass = password(data.password)
    if (!setup && ['admin', 'root', 'administrator', 'system', 'aflish_lee'].includes(name)) fail(400, '此账号名已保留，请选择其他账号名。')
    if (setup && (typeof data.setupToken !== 'string' || data.setupToken.length !== 43)) fail(403, '管理员激活链接无效或已过期。')
    if (await env.DB.prepare('SELECT id FROM accounts WHERE username=?').bind(name).first()) fail(409, '此账号名已被使用。')
    if (setup) {
      const valid = await env.DB.prepare("SELECT value FROM app_settings WHERE key='admin_setup_hash' AND value=? AND EXISTS (SELECT 1 FROM app_settings WHERE key='admin_setup_expires' AND CAST(value AS INTEGER)>?) AND NOT EXISTS (SELECT 1 FROM accounts WHERE role='admin')").bind(hash(String(data.setupToken)), seconds()).first()
      if (!valid) fail(403, '管理员激活链接无效、已使用或已过期。')
    }
    const id = crypto.randomUUID(), recoveryCode = random(), encoded = await passwordHash(pass)
    try {
      if (setup) {
        const results = await env.DB.batch([
          env.DB.prepare("INSERT INTO accounts (id,username,display_name,password_hash,recovery_hash,role,created_at) SELECT ?,?,?,?,?,'admin',? WHERE EXISTS (SELECT 1 FROM app_settings WHERE key='admin_setup_hash' AND value=?) AND EXISTS (SELECT 1 FROM app_settings WHERE key='admin_setup_expires' AND CAST(value AS INTEGER)>?) AND NOT EXISTS (SELECT 1 FROM accounts WHERE role='admin')").bind(id, name, display, encoded, hash(recoveryCode), now(), hash(String(data.setupToken)), seconds()),
          env.DB.prepare("DELETE FROM app_settings WHERE key IN ('admin_setup_hash','admin_setup_expires') AND EXISTS (SELECT 1 FROM accounts WHERE id=? AND role='admin')").bind(id),
        ])
        if (!results[0].meta.changes) fail(403, '激活链接已使用或已过期。')
      } else await env.DB.prepare('INSERT INTO accounts (id,username,display_name,password_hash,recovery_hash,created_at) VALUES (?,?,?,?,?,?)').bind(id, name, display, encoded, hash(recoveryCode), now()).run()
    } catch (error) { if (error instanceof HttpError) throw error; if (String(error).includes('UNIQUE')) fail(409, '此账号名已被使用。'); throw error }
    return newSession(request, env, { id, username: name, displayName: display, role: setup ? 'admin' : 'member' }, { recoveryCode })
  }
  if (path === '/api/auth/login' && method === 'POST') {
    const data = await body(request), name = username(data.username), pass = password(data.password)
    await rate(request, env, 'login-ip', 24)
    await rate(request, env, 'login-name', 24, 900, name)
    const row = await env.DB.prepare('SELECT * FROM accounts WHERE username=?').bind(name).first<UserRow>()
    const valid = await verifyPassword(pass, row?.password_hash ?? `scrypt-32768-8-3$${'0'.repeat(32)}$${'0'.repeat(64)}`)
    if (!row || !valid || row.disabled) fail(401, '账号名或密码不正确。')
    return newSession(request, env, publicUser(row))
  }
  if (path === '/api/auth/recover' && method === 'POST') {
    await rate(request, env, 'recover', 8, 3600)
    const data = await body(request), name = username(data.username), pass = password(data.newPassword), recovery = text(data.recoveryCode, '恢复码', 60, 40)
    const row = await env.DB.prepare('SELECT * FROM accounts WHERE username=? AND disabled=0').bind(name).first<UserRow>()
    if (!row || !equal(hash(recovery), row.recovery_hash)) fail(401, '账号名或恢复码不正确。')
    const recoveryCode = random(), encoded = await passwordHash(pass)
    const results = await env.DB.batch([
      env.DB.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE id=? AND recovery_hash=?').bind(encoded, hash(recoveryCode), row.id, row.recovery_hash),
      env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(row.id),
    ])
    changed(results[0])
    return newSession(request, env, publicUser(row), { recoveryCode })
  }
  if (path === '/api/auth/logout' && method === 'POST') {
    const current = await authorize(request, env)
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(current.tokenHash).run()
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(request, '', 0) })
  }
  if (path === '/api/auth/password' && method === 'POST') {
    const current = await authorize(request, env), data = await body(request)
    await rate(request, env, 'password', 8, 3600, current.user.id)
    const oldPass = password(data.oldPassword), newPass = password(data.newPassword)
    const row = await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(current.user.id).first<UserRow>()
    if (!row || !(await verifyPassword(oldPass, row.password_hash))) fail(401, '原密码不正确。')
    const recoveryCode = random(), encoded = await passwordHash(newPass)
    const results = await env.DB.batch([
      env.DB.prepare('UPDATE accounts SET password_hash=?,recovery_hash=? WHERE id=? AND password_hash=?').bind(encoded, hash(recoveryCode), row.id, row.password_hash),
      env.DB.prepare('DELETE FROM sessions WHERE account_id=?').bind(row.id),
    ])
    changed(results[0])
    return newSession(request, env, current.user, { recoveryCode })
  }
  if (path === '/api/community/posts' && method === 'GET') {
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1') || 1)), pageSize = 12
    const query = (url.searchParams.get('q') ?? '').trim().slice(0, 100), category = url.searchParams.get('category') ?? ''
    const terms = query.split(/\s+/u).filter(Boolean).slice(0, 6)
    const clauses = ['1=1'], args: string[] = []
    if (category && category !== '全部') { if (!categories.includes(category)) fail(400, '卷目无效。'); clauses.push('p.category=?'); args.push(category) }
    for (const term of terms) { clauses.push("(p.title||' '||p.summary||' '||p.body||' '||p.tags_json) LIKE ? ESCAPE '\\'"); args.push(`%${term.replace(/[\\%_]/gu, '\\$&')}%`) }
    const where = clauses.join(' AND ')
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM published_articles p WHERE ${where}`).bind(...args).first<{ total: number }>()
    const rows = await env.DB.prepare(`SELECT p.id,p.title,p.category,p.event_date,p.summary,'' AS body,p.sources_json,p.tags_json,p.version,p.published_at,p.updated_at,a.display_name AS author_name FROM published_articles p JOIN accounts a ON a.id=p.author_id WHERE ${where} ORDER BY p.published_at DESC,p.id LIMIT ? OFFSET ?`).bind(...args, pageSize, (page - 1) * pageSize).all<SubmissionRow>()
    return json({ items: rows.results.map(article), total: count?.total ?? 0, page, pageSize })
  }
  const publicMatch = /^\/api\/community\/posts\/([a-f0-9-]{36})$/u.exec(path)
  if (publicMatch && method === 'GET') {
    const row = await env.DB.prepare('SELECT p.*,a.display_name AS author_name FROM published_articles p JOIN accounts a ON a.id=p.author_id WHERE p.id=?').bind(publicMatch[1]).first<SubmissionRow>()
    if (!row) fail(404, '文章尚未发布或已下架。')
    return json(article(row))
  }
  if (path === '/api/my/submissions') {
    const current = await authorize(request, env)
    if (method === 'GET') {
      const rows = await env.DB.prepare(`${submissionSelect} WHERE s.author_id=? ORDER BY s.updated_at DESC LIMIT 100`).bind(current.user.id).all<SubmissionRow>()
      return json({ items: rows.results.map(submission) })
    }
    if (method === 'POST') {
      await rate(request, env, 'new-draft', 30, 3600, current.user.id)
      const input = articleInput(await body(request)), id = crypto.randomUUID(), date = now()
      const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM submissions WHERE author_id=?').bind(current.user.id).first<{ total: number }>()
      if (count && count.total >= 100) fail(400, '每个账号最多保留100篇稿件，请先删除不用的草稿。')
      await env.DB.prepare('INSERT INTO submissions (id,author_id,title,category,event_date,summary,body,sources_json,tags_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(id, current.user.id, ...fields(input), date, date).run()
      return json(submission(await loadSubmission(env, id, current.user)), 201)
    }
  }
  const ownMatch = /^\/api\/my\/submissions\/([a-f0-9-]{36})(?:\/(submit|withdraw))?$/u.exec(path)
  if (ownMatch) {
    const current = await authorize(request, env), id = ownMatch[1], action = ownMatch[2]
    const row = await loadSubmission(env, id, { ...current.user, role: 'member' })
    if (method === 'GET' && !action) return json({ submission: submission(row), reviews: await reviews(env, id) })
    const data = await body(request), expected = version(data)
    if (method === 'PUT' && !action) {
      if (row.status === 'pending') fail(409, '稿件正在审核，请先撤回再修改。')
      await rate(request, env, 'save', 120, 3600, current.user.id)
      const input = articleInput(data)
      changed(await env.DB.prepare("UPDATE submissions SET title=?,category=?,event_date=?,summary=?,body=?,sources_json=?,tags_json=?,status='draft',version=version+1,review_note='',updated_at=?,reviewed_at=NULL WHERE id=? AND author_id=? AND version=? AND status!='pending'").bind(...fields(input), now(), id, current.user.id, expected).run())
    } else if (method === 'POST' && action === 'submit') {
      submitReady(row)
      await rate(request, env, 'submit', 30, 3600, current.user.id)
      changed(await env.DB.prepare("UPDATE submissions SET status='pending',submitted_at=?,updated_at=?,review_note='',reviewed_at=NULL WHERE id=? AND author_id=? AND version=? AND status IN ('draft','rejected')").bind(now(), now(), id, current.user.id, expected).run())
    } else if (method === 'POST' && action === 'withdraw') {
      changed(await env.DB.prepare("UPDATE submissions SET status='draft',updated_at=? WHERE id=? AND author_id=? AND version=? AND status='pending'").bind(now(), id, current.user.id, expected).run())
    } else if (method === 'DELETE' && !action) {
      changed(await env.DB.prepare("DELETE FROM submissions WHERE id=? AND author_id=? AND version=? AND status='draft' AND NOT EXISTS (SELECT 1 FROM published_articles WHERE id=?) AND NOT EXISTS (SELECT 1 FROM reviews WHERE submission_id=?)").bind(id, current.user.id, expected, id, id).run())
      return json({ ok: true })
    } else fail(405, '不支持此操作。')
    return json(submission(await loadSubmission(env, id, current.user)))
  }
  if (path === '/api/admin/submissions' && method === 'GET') {
    await authorize(request, env, true)
    const state = url.searchParams.get('status') ?? 'pending'
    if (!['pending', 'approved', 'rejected', 'draft', 'published'].includes(state)) fail(400, '筛选状态无效。')
    const condition = state === 'published' ? 'p.id IS NOT NULL' : 's.status=?'
    const page = Math.max(1, Math.min(10000, Number.parseInt(url.searchParams.get('page') ?? '1') || 1)), pageSize = 20
    const rows = await env.DB.prepare(`${submissionSelect} WHERE ${condition} ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`).bind(...(state === 'published' ? [] : [state]), pageSize, (page - 1) * pageSize).all<SubmissionRow>()
    const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM submissions s LEFT JOIN published_articles p ON p.id=s.id WHERE ${condition}`).bind(...(state === 'published' ? [] : [state])).first<{ total: number }>()
    return json({ items: rows.results.map(submission), total: count?.total ?? 0, page, pageSize })
  }
  const adminMatch = /^\/api\/admin\/submissions\/([a-f0-9-]{36})(?:\/(review|unpublish))?$/u.exec(path)
  if (adminMatch) {
    const current = await authorize(request, env, true), id = adminMatch[1], action = adminMatch[2]
    const row = await loadSubmission(env, id, current.user)
    if (method === 'GET' && !action) return json({ submission: submission(row), reviews: await reviews(env, id) })
    if (method !== 'POST') fail(405, '不支持此操作。')
    const data = await body(request), note = text(data.note ?? '', '审核意见', 2000, 0), date = now(), logId = crypto.randomUUID()
    if (action === 'review') {
      const expected = version(data), decision = data.decision
      if (!['approve', 'reject'].includes(String(decision))) fail(400, '请选择通过或退回。')
      if (row.status !== 'pending' || row.version !== expected) fail(409, '稿件已变化，请刷新再审。')
      if (decision === 'reject' && note.length < 3) fail(400, '退回时请说明至少3字的修改理由。')
      submitReady(row)
      const statements: D1PreparedStatement[] = []
      if (decision === 'approve') statements.push(env.DB.prepare("INSERT INTO published_articles (id,author_id,title,category,event_date,summary,body,sources_json,tags_json,version,published_at,updated_at) SELECT id,author_id,title,category,event_date,summary,body,sources_json,tags_json,version,?,? FROM submissions WHERE id=? AND status='pending' AND version=? ON CONFLICT(id) DO UPDATE SET title=excluded.title,category=excluded.category,event_date=excluded.event_date,summary=excluded.summary,body=excluded.body,sources_json=excluded.sources_json,tags_json=excluded.tags_json,version=excluded.version,updated_at=excluded.updated_at").bind(date, date, id, expected))
      statements.push(env.DB.prepare("INSERT INTO reviews (id,submission_id,actor_id,action,version,note,snapshot_json,created_at) SELECT ?,id,?,?,version,?,?,? FROM submissions WHERE id=? AND status='pending' AND version=?").bind(logId, current.user.id, decision, note, JSON.stringify(submission(row)), date, id, expected))
      statements.push(env.DB.prepare("UPDATE submissions SET status=?,review_note=?,reviewed_at=?,reviewer_id=?,updated_at=? WHERE id=? AND status='pending' AND version=?").bind(decision === 'approve' ? 'approved' : 'rejected', note, date, current.user.id, date, id, expected))
      const results = await env.DB.batch(statements)
      changed(results[results.length - 1])
    } else if (action === 'unpublish') {
      if (note.length < 3) fail(400, '下架时请说明至少3字的原因。')
      const expected = version(data)
      const published = await env.DB.prepare('SELECT p.*,a.display_name AS author_name FROM published_articles p JOIN accounts a ON a.id=p.author_id WHERE p.id=? AND p.version=?').bind(id, expected).first<SubmissionRow>()
      if (!published) fail(409, '公开版本已变化，请刷新后再操作。')
      const results = await env.DB.batch([
        env.DB.prepare('INSERT INTO reviews (id,submission_id,actor_id,action,version,note,snapshot_json,created_at) SELECT ?,id,?,\'unpublish\',version,?,?,? FROM published_articles WHERE id=? AND version=?').bind(logId, current.user.id, note, JSON.stringify(article(published)), date, id, expected),
        env.DB.prepare('DELETE FROM published_articles WHERE id=? AND version=?').bind(id, expected),
        env.DB.prepare("UPDATE submissions SET status='rejected',review_note=?,reviewed_at=?,reviewer_id=?,updated_at=? WHERE id=? AND status='approved' AND version=? AND NOT EXISTS (SELECT 1 FROM published_articles WHERE id=?)").bind(note, date, current.user.id, date, id, expected, id),
      ])
      changed(results[1])
    } else fail(404, '接口不存在。')
    return json({ submission: submission(await loadSubmission(env, id, current.user)), reviews: await reviews(env, id) })
  }
  fail(404, '接口不存在。')
}
async function reviews(env: Env, id: string) {
  const rows = await env.DB.prepare('SELECT r.id,r.action,r.note,r.version,r.created_at AS createdAt,a.display_name AS reviewerName FROM reviews r JOIN accounts a ON a.id=r.actor_id WHERE submission_id=? ORDER BY r.created_at DESC LIMIT 100').bind(id).all()
  return rows.results
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/api')) return env.ASSETS.fetch(request)
    try { return await api(request, env) } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, error.status === 429 ? { 'Retry-After': '900' } : {})
      console.error('API failure', error instanceof Error ? error.message : 'unknown')
      return json({ error: '服务暂时不可用，请稍后重试。' }, 503)
    }
  },
} satisfies ExportedHandler<Env>
