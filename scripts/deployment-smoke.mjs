import { strict as assert } from 'node:assert'
import { chromium } from 'playwright-core'

const baseUrl = (process.env.CYBER_ARCHIVE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const browserPath = process.env.CYBER_BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const routes = [
  '/',
  '/archive',
  '/timeline',
  '/volumes',
  '/statistics',
  '/graph',
  '/about',
  '/event/cyber-2016-eq-002',
]

const homeResponse = await fetch(`${baseUrl}/`)
assert.equal(homeResponse.status, 200, '首页 HTTP 状态不是 200')
assert.match(homeResponse.headers.get('content-type') ?? '', /text\/html/i)
const homeHtml = await homeResponse.text()
assert.match(homeHtml, /<div id="root"><\/div>/)

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, { headers: { 'Sec-Fetch-Mode': 'navigate' } })
  assert.equal(response.status, 200, `${route} HTTP 状态不是 200`)
  assert.match(response.headers.get('content-type') ?? '', /text\/html/i, `${route} 没有返回 SPA HTML`)
  assert.match(await response.text(), /<div id="root"><\/div>/, `${route} 没有回退到 SPA 入口`)
}

const assetPaths = [...homeHtml.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))"/g)].map((match) => match[1])
assert(assetPaths.length >= 2, '未在构建入口中找到 JS/CSS 资源')
for (const assetPath of assetPaths) {
  const response = await fetch(new URL(assetPath, baseUrl))
  assert.equal(response.status, 200, `${assetPath} 加载失败`)
  const contentType = response.headers.get('content-type') ?? ''
  assert(!contentType.includes('text/html'), `${assetPath} 被错误回退为 HTML`)
}

const faviconResponse = await fetch(`${baseUrl}/favicon.svg`)
assert.equal(faviconResponse.status, 200, 'favicon 加载失败')
assert.match(faviconResponse.headers.get('content-type') ?? '', /image\/svg\+xml/i)

const browser = await chromium.launch({ executablePath: browserPath, headless: true })
const browserErrors = []

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  const page = await context.newPage()
  page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(`console: ${message.text()}`)
  })
  page.on('response', (response) => {
    if (response.url().startsWith(baseUrl) && response.status() >= 400) {
      browserErrors.push(`response ${response.status()}: ${response.url()}`)
    }
  })

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    await page.locator('main').waitFor()
    assert.equal(new URL(page.url()).pathname, route, `${route} 被意外改写到其他前端路由`)
    assert((await page.locator('body').innerText()).trim().length > 100, `${route} 页面内容异常为空`)
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('main').waitFor()
  }

  await context.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-CN' })
  const mobilePage = await mobileContext.newPage()
  for (const route of ['/archive', '/event/cyber-2016-eq-002']) {
    await mobilePage.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
    await mobilePage.locator('main').waitFor()
    const widths = await mobilePage.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
    assert(widths.document <= widths.viewport + 1, `${route} 移动端 document 横向溢出：${JSON.stringify(widths)}`)
    assert(widths.body <= widths.viewport + 1, `${route} 移动端 body 横向溢出：${JSON.stringify(widths)}`)
  }
  await mobileContext.close()

  assert.deepEqual(browserErrors, [], browserErrors.join('\n'))
} finally {
  await browser.close()
}

process.stdout.write(`部署 smoke test 通过：${baseUrl}（${routes.length} 个路由、静态资源、刷新、移动端）\n`)
