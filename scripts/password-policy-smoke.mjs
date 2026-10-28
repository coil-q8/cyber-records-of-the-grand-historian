import { strict as assert } from 'node:assert'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = (process.env.CYBER_ARCHIVE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/u, '')
const browserPath = process.env.CYBER_BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const username = `qa_policy_${randomBytes(6).toString('hex')}`
const passwords = new Set()
while (passwords.size < 3) passwords.add(randomBytes(4).toString('hex'))
const [first, second, third] = [...passwords]
const ids = { accounts: [], submissions: [] }
const actor = { cookie: '', csrf: '' }
async function request(path, data, expected = 200) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json', ...(actor.cookie ? { Cookie: actor.cookie } : {}), ...(actor.csrf ? { 'X-CSRF-Token': actor.csrf } : {}) }, body: JSON.stringify(data) })
  const value = await response.json()
  assert.equal(response.status, expected, `${path}: ${value.error ?? 'unexpected status'}`)
  if (response.headers.get('set-cookie')) actor.cookie = response.headers.get('set-cookie').split(';')[0]
  if (value.csrfToken) actor.csrf = value.csrfToken
  return value
}
let browser
try {
  const signup = { username, displayName: '密码边界验收', password: first }
  const short = await request('/api/auth/register', { ...signup, password: first.slice(0, 7) }, 400)
  assert.match(short.error, /8—128/u)
  const setup = { ...signup, setupToken: randomBytes(32).toString('base64url') }
  await request('/api/auth/setup', { ...setup, password: first.slice(0, 7) }, 400)
  await request('/api/auth/setup', setup, 403) // Invalid capability, not the owner's activation token.
  const registration = await request('/api/auth/register', signup)
  ids.accounts.push(registration.user.id)
  assert.equal(registration.user.role, 'member')
  await request('/api/auth/login', { username, password: first })
  console.log('✓ 服务端拒绝7位密码、接受8位注册和登录；管理员激活沿用同一规则')

  browser = await chromium.launch({ executablePath: browserPath, headless: true })
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  for (const route of ['/account', '/account?mode=register', '/account?mode=recover', '/admin/setup']) {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    const fields = page.locator('input[type="password"]')
    await fields.first().waitFor()
    for (const field of await fields.all()) {
      assert.equal(await field.getAttribute('minlength'), '8', `${route} 密码最短长度不一致`)
      assert.equal(await field.getAttribute('maxlength'), '128')
      await field.fill(first.slice(0, 7))
      assert.equal(await field.evaluate((input) => input.validity.tooShort), true)
      await field.fill(first)
      assert.equal(await field.evaluate((input) => input.checkValidity()), true)
    }
  }
  await page.goto(`${base}/account`, { waitUntil: 'networkidle' })
  await page.getByLabel('账号名', { exact: true }).fill(username)
  await page.getByLabel('密码', { exact: true }).fill(first)
  await page.getByRole('button', { name: '登录账号', exact: true }).click()
  await page.locator('.account-banner').waitFor()
  await page.getByRole('button', { name: '修改密码' }).click()
  for (const field of await page.locator('.account-security input[type="password"]').all()) assert.equal(await field.getAttribute('minlength'), '8')
  await page.getByLabel('原密码', { exact: true }).fill(first)
  await page.getByLabel('新密码', { exact: true }).fill(second)
  await page.getByLabel('再次输入密码', { exact: true }).fill(second)
  await page.getByRole('button', { name: '保存新密码', exact: true }).click()
  await page.getByTestId('recovery-code').waitFor()
  const recoveryCode = await page.getByTestId('recovery-code').innerText()
  await page.getByRole('button', { name: '已保存，继续' }).click()
  await page.getByRole('button', { name: '退出', exact: true }).click()
  await page.getByRole('button', { name: '登录账号', exact: true }).waitFor()
  await request('/api/auth/recover', { username, recoveryCode, newPassword: third.slice(0, 7) }, 400)
  await request('/api/auth/recover', { username, recoveryCode, newPassword: third })
  await request('/api/auth/login', { username, password: third })
  assert.deepEqual(errors, [])
  console.log('✓ 浏览器注册、登录、管理员激活、找回与修改密码均允许8位；真实8位改密和恢复通过')
} finally {
  if (browser) await browser.close()
  await mkdir(new URL('../.wrangler/test-artifacts/', import.meta.url), { recursive: true })
  await writeFile(new URL('../.wrangler/test-artifacts/password-policy-ids.json', import.meta.url), JSON.stringify(ids), 'utf8')
  console.log(`PASSWORD_TEST_IDS=${JSON.stringify(ids)}`)
}
console.log('8位密码边界测试通过。')
