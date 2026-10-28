import { strict as assert } from 'node:assert'
import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = (process.env.CYBER_ARCHIVE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/u, '')
const browserPath = process.env.CYBER_BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const suffix = randomBytes(6).toString('hex'), password = `Test-only-${randomBytes(24).toString('hex')}`
const localTest = ['127.0.0.1', 'localhost'].includes(new URL(base).hostname)
let savedAdmin
if (localTest && !process.env.CYBER_TEST_ADMIN_USERNAME) { try { savedAdmin = JSON.parse(await readFile(new URL('../.wrangler/private/local-test-admin.json', import.meta.url), 'utf8')) } catch {} }
const adminName = process.env.CYBER_TEST_ADMIN_USERNAME?.trim() ?? savedAdmin?.username ?? `qa_admin_${suffix}`
const adminPassword = process.env.CYBER_TEST_ADMIN_PASSWORD?.trim() ?? savedAdmin?.password ?? password
assert(adminName.startsWith('qa_'), '验收仅使用 qa_ 开头的临时管理员账号。')
let ids = { accounts: [], submissions: [] }
if (localTest) { try { ids = JSON.parse(await readFile(new URL('../.wrangler/test-artifacts/community-ids.json', import.meta.url), 'utf8')) } catch {} }
const screenshots = process.env.CYBER_SCREENSHOT_DIR
if (screenshots) await mkdir(screenshots, { recursive: true })
function client() { return { cookie: '', csrf: '' } }
async function request(actor, path, method = 'GET', data, status = 200, headers = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(method !== 'GET' ? { 'Origin': base, 'Content-Type': 'application/json' } : {}), ...(actor.cookie ? { Cookie: actor.cookie } : {}), ...(actor.csrf ? { 'X-CSRF-Token': actor.csrf } : {}), ...headers }, body: data === undefined ? undefined : JSON.stringify(data) })
  const value = await response.json()
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(value)}`)
  if (response.headers.get('set-cookie')) actor.cookie = response.headers.get('set-cookie').split(';')[0]
  if (value.csrfToken) actor.csrf = value.csrfToken
  return { value, response }
}
const guest = client(), alice = client(), bob = client(), admin = client()
const prose = '此段为自动化验收稿件，仅用于验证投稿与审核流程，不叙述真实事件。记录需要区分已知事实、当事方说法和未核实线索，并为每项重要判断列明可核查出处。'.repeat(7)
const input = { title: `自动验收稿件 ${suffix}`, category: '丑角', eventDate: '2026-10', summary: '这是一篇自动化流程验收稿，所有内容仅用于测试保存、退回、修改和公开版本，不属于正式史料。', body: prose, tags: ['自动验收', suffix], sources: [{ title: '来源格式验收', url: 'https://www.cloudflare.com/' }] }
let browser
let pages = []
try {
  await request(guest, '/api/health')
  await request(guest, '/api/not-a-route', 'GET', undefined, 404)
  await request(guest, '/api/my/submissions', 'GET', undefined, 401)
  if (process.env.CYBER_TEST_ADMIN_USERNAME || savedAdmin) {
    const result = await request(admin, '/api/auth/login', 'POST', { username: adminName, password: adminPassword })
    assert.equal(result.value.user.role, 'admin')
    if (savedAdmin) ids.accounts.push(result.value.user.id)
  } else {
    assert(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), '首次管理员激活测试仅允许在本机运行。')
    const html = await readFile(new URL('../.wrangler/private/admin-setup.html', import.meta.url), 'utf8')
    const setupToken = html.match(/#setup=([a-zA-Z0-9_-]{43})/u)?.[1]
    assert(setupToken, '请先生成并对本地数据库应用管理员激活 SQL。')
    const result = await request(admin, '/api/auth/setup', 'POST', { username: adminName, displayName: '自动验收管理员', password: adminPassword, setupToken })
    assert.equal(result.value.user.role, 'admin'); ids.accounts.push(result.value.user.id)
    await writeFile(new URL('../.wrangler/private/local-test-admin.json', import.meta.url), JSON.stringify({ username: adminName, password: adminPassword }), 'utf8')
    await request(guest, '/api/auth/setup', 'POST', { username: `qa_second_admin_${suffix}`, displayName: '二次激活验收', password, setupToken }, 403)
  }
  await request(guest, '/api/auth/register', 'POST', { username: 'admin', displayName: '越权验收', password, role: 'admin' }, 400)
  const aliceName = `qa_author_${suffix}`, bobName = `qa_other_${suffix}`
  const registration = await request(alice, '/api/auth/register', 'POST', { username: aliceName, displayName: '自动验收作者', password, role: 'admin' })
  assert.equal(registration.value.user.role, 'member'); ids.accounts.push(registration.value.user.id)
  assert.match(registration.response.headers.get('set-cookie'), /HttpOnly/iu)
  assert.match(registration.response.headers.get('set-cookie'), /SameSite=Lax/iu)
  if (base.startsWith('https:')) assert.match(registration.response.headers.get('set-cookie'), /Secure/iu)
  const firstRecovery = registration.value.recoveryCode
  await request(guest, '/api/auth/register', 'POST', { username: aliceName.toUpperCase(), displayName: '重名验收', password }, 409)
  const bobResult = await request(bob, '/api/auth/register', 'POST', { username: bobName, displayName: '另一个验收账号', password })
  ids.accounts.push(bobResult.value.user.id)
  await request(guest, '/api/auth/login', 'POST', { username: aliceName, password: 'Incorrect-Password-12345' }, 401)
  await request(alice, '/api/admin/submissions', 'GET', undefined, 403)
  await request(alice, '/api/my/submissions', 'POST', input, 403, { Origin: 'https://not-this-site.invalid' })
  await request({ ...alice, csrf: '' }, '/api/my/submissions', 'POST', input, 403)
  await request(alice, '/api/my/submissions', 'POST', { ...input, sources: [{ title: '恶意链接验收', url: 'javascript:alert(1)' }] }, 400)
  const created = (await request(alice, '/api/my/submissions', 'POST', input, 201)).value
  ids.submissions.push(created.id)
  assert.equal(created.status, 'draft')
  await request(bob, `/api/my/submissions/${created.id}`, 'GET', undefined, 404)
  await request(bob, `/api/my/submissions/${created.id}`, 'PUT', { ...input, version: 1 }, 404)
  await request(guest, `/api/community/posts/${created.id}`, 'GET', undefined, 404)
  let state = (await request(alice, `/api/my/submissions/${created.id}/submit`, 'POST', { version: 1 })).value
  assert.equal(state.status, 'pending')
  await request(alice, `/api/my/submissions/${created.id}`, 'PUT', { ...input, version: 1 }, 409)
  await request(alice, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'approve', version: 1 }, 403)
  await request(guest, `/api/community/posts/${created.id}`, 'GET', undefined, 404)
  assert.equal((await request(guest, `/api/community/posts?q=${suffix}`)).value.total, 0)
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'reject', note: '', version: 1 }, 400)
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'reject', note: '请补充原始出处及事实边界。', version: 1 })
  const returned = (await request(alice, `/api/my/submissions/${created.id}`)).value
  assert.equal(returned.submission.status, 'rejected'); assert.equal(returned.reviews.length, 1)
  assert.match(returned.submission.reviewNote, /原始出处/u)
  state = (await request(alice, `/api/my/submissions/${created.id}`, 'PUT', { ...input, version: 1 })).value
  assert.equal(state.version, 2)
  await request(alice, `/api/my/submissions/${created.id}`, 'PUT', { ...input, version: 1 }, 409)
  await request(alice, `/api/my/submissions/${created.id}/submit`, 'POST', { version: 2 })
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'approve', version: 1 }, 409)
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'approve', version: 2, note: '已核对流程验收来源。' })
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'approve', version: 2 }, 409)
  const published = (await request(guest, `/api/community/posts/${created.id}`)).value
  assert.equal(published.body, prose); assert.equal(published.version, 2); assert(!('reviewNote' in published))
  assert.equal((await request(guest, `/api/community/posts?q=${suffix}%20原始&category=丑角`)).value.total, 0)
  assert.equal((await request(guest, `/api/community/posts?q=${suffix}%20自动验收&category=丑角`)).value.total, 1)
  const changedInput = { ...input, body: `${prose}\n\n新增的版本必须再次审核。` }
  state = (await request(alice, `/api/my/submissions/${created.id}`, 'PUT', { ...changedInput, version: 2 })).value
  assert.equal(state.status, 'draft'); assert.equal(state.publishedVersion, 2)
  assert.equal((await request(guest, `/api/community/posts/${created.id}`)).value.body, prose)
  await request(alice, `/api/my/submissions/${created.id}/submit`, 'POST', { version: 3 })
  assert.equal((await request(guest, `/api/community/posts/${created.id}`)).value.body, prose)
  await request(alice, `/api/my/submissions/${created.id}/withdraw`, 'POST', { version: 3 })
  assert.equal((await request(guest, `/api/community/posts/${created.id}`)).value.version, 2)
  await request(alice, `/api/my/submissions/${created.id}/submit`, 'POST', { version: 3 })
  await request(admin, `/api/admin/submissions/${created.id}/review`, 'POST', { decision: 'approve', version: 3, note: '同意刊载修订版。' })
  assert.equal((await request(guest, `/api/community/posts/${created.id}`)).value.body, changedInput.body)
  await request(admin, `/api/admin/submissions/${created.id}/unpublish`, 'POST', { note: '验收完成，移除测试刊载。', version: 2 }, 409)
  await request(admin, `/api/admin/submissions/${created.id}/unpublish`, 'POST', { note: '验收完成，移除测试刊载。', version: 3 })
  await request(guest, `/api/community/posts/${created.id}`, 'GET', undefined, 404)
  const short = (await request(alice, '/api/my/submissions', 'POST', { ...input, title: '', body: '', sources: [] }, 201)).value
  ids.submissions.push(short.id)
  await request(alice, `/api/my/submissions/${short.id}/submit`, 'POST', { version: 1 }, 400)
  await request(alice, `/api/my/submissions/${short.id}`, 'DELETE', { version: 1 })
  const otherSession = client()
  await request(otherSession, '/api/auth/login', 'POST', { username: aliceName.toUpperCase(), password })
  const newPassword = `${password}-revised`
  const changedPassword = (await request(alice, '/api/auth/password', 'POST', { oldPassword: password, newPassword })).value
  assert.equal((await request(otherSession, '/api/auth/session')).value.user, null)
  await request(guest, '/api/auth/recover', 'POST', { username: aliceName, newPassword: password, recoveryCode: firstRecovery }, 401)
  const reset = (await request(guest, '/api/auth/recover', 'POST', { username: aliceName, newPassword: password, recoveryCode: changedPassword.recoveryCode })).value
  assert(reset.recoveryCode); assert.equal((await request(alice, '/api/auth/session')).value.user, null)
  await request(bob, '/api/auth/recover', 'POST', { username: aliceName, newPassword: password, recoveryCode: changedPassword.recoveryCode }, 401)
  await request(guest, '/api/auth/logout', 'POST', {})
  assert.equal((await request(guest, '/api/auth/session')).value.user, null)
  console.log('✓ 服务端：账号、恢复码、Cookie/CSRF、越权隔离、乐观锁、审核、发布快照及下架')

  browser = await chromium.launch({ executablePath: browserPath, headless: true })
  const authorContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-CN', isMobile: true, hasTouch: true })
  const authorPage = await authorContext.newPage(), adminPage = await adminContext.newPage(), publicPage = await publicContext.newPage()
  pages = [authorPage, adminPage, publicPage]
  const errors = []
  for (const page of [authorPage, adminPage, publicPage]) {
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  }
  await authorPage.goto(`${base}/account?mode=register`, { waitUntil: 'networkidle' })
  await authorPage.getByLabel('账号名', { exact: true }).fill(`qa_browser_${suffix}`)
  await authorPage.getByLabel('公开署名', { exact: true }).fill('浏览器验收作者')
  await authorPage.getByLabel('密码', { exact: true }).fill(password)
  await authorPage.getByLabel('再次输入密码', { exact: true }).fill(password)
  await authorPage.getByRole('button', { name: '创建账号', exact: true }).click()
  await authorPage.getByTestId('recovery-code').waitFor()
  const browserSession = await authorContext.request.get(`${base}/api/auth/session`)
  ids.accounts.push((await browserSession.json()).user.id)
  assert((await authorContext.cookies()).some((cookie) => cookie.httpOnly))
  assert(!(await authorPage.evaluate(() => document.cookie)).includes('cyber_session'))
  await authorPage.getByRole('button', { name: '已保存，继续' }).click()
  await authorPage.getByRole('link', { name: '写一篇', exact: true }).click()
  await authorPage.getByLabel('篇名', { exact: true }).fill(`浏览器验收稿 ${suffix}`)
  await authorPage.getByLabel('稿件卷目').selectOption('恶企')
  await authorPage.getByLabel('事件日期', { exact: true }).fill('2026-10-28')
  await authorPage.getByLabel('摘要', { exact: true }).fill(input.summary)
  const safeBody = `${prose}\n\n<script>window.__userScriptExecuted = true</script>`
  await authorPage.getByLabel('正文', { exact: true }).fill(safeBody)
  await authorPage.getByLabel('索引标签', { exact: true }).fill('自动验收，浏览器')
  await authorPage.getByRole('button', { name: '添加来源' }).click()
  await authorPage.getByLabel('来源1标题').fill('来源格式验收')
  await authorPage.getByLabel('来源1网址').fill('https://www.cloudflare.com/')
  await authorPage.locator('.writing-toolbar').getByRole('button', { name: '保存草稿', exact: true }).click()
  await authorPage.waitForURL(/\/write\/[a-f0-9-]{36}/u)
  const browserId = new URL(authorPage.url()).pathname.split('/').at(-1)
  ids.submissions.push(browserId)
  await authorPage.reload({ waitUntil: 'networkidle' })
  assert.equal(await authorPage.getByLabel('正文', { exact: true }).inputValue(), safeBody)
  await authorPage.getByRole('button', { name: '预览', exact: true }).click()
  await authorPage.locator('.writing-preview').waitFor()
  assert.equal(await authorPage.evaluate(() => window.__userScriptExecuted), undefined)
  await authorPage.getByRole('button', { name: '提交审核', exact: true }).click()
  await authorPage.getByRole('button', { name: '撤回并继续修改' }).waitFor()
  await request(guest, `/api/community/posts/${browserId}`, 'GET', undefined, 404)
  await adminPage.goto(`${base}/account`, { waitUntil: 'networkidle' })
  await adminPage.getByLabel('账号名', { exact: true }).fill(adminName)
  await adminPage.getByLabel('密码', { exact: true }).fill(adminPassword)
  await adminPage.getByRole('button', { name: '登录账号', exact: true }).click()
  await adminPage.getByRole('link', { name: '进入审稿台', exact: true }).click()
  await adminPage.getByRole('link', { name: `浏览器验收稿 ${suffix}`, exact: true }).click()
  await adminPage.getByLabel('审核意见', { exact: true }).fill('自动化验收通过，随后移除测试稿件。')
  if (screenshots) await adminPage.screenshot({ path: `${screenshots}/admin-review.png`, fullPage: true })
  await adminPage.getByRole('button', { name: '通过并公开', exact: true }).click()
  await adminPage.getByText('已通过审核，文章已在共撰页面公开。', { exact: true }).waitFor()
  await publicPage.goto(`${base}/community/${browserId}`, { waitUntil: 'networkidle' })
  await publicPage.getByRole('heading', { name: `浏览器验收稿 ${suffix}`, exact: true }).waitFor()
  assert.equal(await publicPage.evaluate(() => window.__userScriptExecuted), undefined)
  assert((await publicPage.locator('.contribution-body').innerText()).includes('<script>'))
  assert.equal(await publicPage.locator('.contribution-sources a').first().getAttribute('href'), 'https://www.cloudflare.com/')
  await publicPage.reload({ waitUntil: 'networkidle' }); await publicPage.locator('.contribution-body').waitFor()
  if (screenshots) await publicPage.screenshot({ path: `${screenshots}/public-mobile.png`, fullPage: true })
  for (const route of ['/community', '/account?mode=register', '/write', '/admin']) {
    await publicPage.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    await publicPage.locator('main').waitFor()
    assert(await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${route} 移动端溢出`)
  }
  await publicPage.goto(`${base}/community?q=${suffix}`, { waitUntil: 'networkidle' })
  await publicPage.locator('.community-card').waitFor()
  assert.equal(await publicPage.locator('.community-card').count(), 1)
  await publicPage.reload({ waitUntil: 'networkidle' }); await publicPage.locator('.community-card').waitFor()
  await authorPage.goto(`${base}/write/${browserId}`, { waitUntil: 'networkidle' })
  await authorPage.getByLabel('正文', { exact: true }).fill(`${safeBody}\n\n此为未审核的修订，不可直接公开。`)
  await authorPage.locator('.writing-toolbar').getByRole('button', { name: '保存草稿', exact: true }).click()
  await authorPage.getByText('草稿已保存到账号。', { exact: true }).waitFor()
  assert.equal((await request(guest, `/api/community/posts/${browserId}`)).value.body, safeBody)
  if (screenshots) {
    await authorPage.screenshot({ path: `${screenshots}/editor-dark.png`, fullPage: true })
    await authorPage.getByRole('button', { name: '切换至浅色背景' }).click()
    await authorPage.screenshot({ path: `${screenshots}/editor-light.png`, fullPage: true })
  }
  await authorPage.setViewportSize({ width: 390, height: 844 })
  await authorPage.goto(`${base}/write/${browserId}`, { waitUntil: 'networkidle' })
  await authorPage.getByLabel('正文', { exact: true }).waitFor()
  assert(await authorPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '手机撰稿页溢出')
  assert.equal(await authorPage.getByLabel('来源1网址').inputValue(), 'https://www.cloudflare.com/')
  if (screenshots) await authorPage.screenshot({ path: `${screenshots}/editor-mobile.png`, fullPage: true })
  await authorPage.goto(`${base}/account`, { waitUntil: 'networkidle' })
  await authorPage.locator('.submission-list').waitFor()
  assert(await authorPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '手机账号页溢出')
  const current = (await request(admin, `/api/admin/submissions/${browserId}`)).value.submission
  await request(admin, `/api/admin/submissions/${browserId}/unpublish`, 'POST', { note: '验收结束，移除浏览器测试文章。', version: current.publishedVersion })
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log('✓ 浏览器：真实注册、草稿保存/刷新、提交、管理员刊载、来源链接、脚本转义、移动端及公开快照')
} catch (error) {
  for (const [index, page] of pages.entries()) {
    console.error('Browser diagnostic', index, page.url(), await page.locator('.form-error,.community-error,.community-empty').allTextContents().catch(() => []))
    if (screenshots) await page.screenshot({ path: `${screenshots}/failure-${index}.png`, fullPage: true }).catch(() => {})
  }
  throw error
} finally {
  if (browser) await browser.close()
  await mkdir(new URL('../.wrangler/test-artifacts/', import.meta.url), { recursive: true })
  await writeFile(new URL('../.wrangler/test-artifacts/community-ids.json', import.meta.url), JSON.stringify(ids), 'utf8')
  console.log(`COMMUNITY_TEST_IDS=${JSON.stringify(ids)}`)
}
console.log('账号与投稿审核 smoke test 通过。')
