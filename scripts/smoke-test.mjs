import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseUrl = process.env.CYBER_ARCHIVE_URL ?? 'http://127.0.0.1:5173'
const browserPath = process.env.CYBER_BROWSER_PATH ?? 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const sourceEvents = JSON.parse(await readFile(new URL('../data/events.json', import.meta.url), 'utf8'))
const failures = []
const checks = []

function record(name) {
  checks.push(name)
  process.stdout.write(`✓ ${name}\n`)
}

function watchPage(page, label) {
  page.on('pageerror', (error) => failures.push(`${label} pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('fonts.googleapis.com')) failures.push(`${label} console: ${message.text()}`)
  })
}

async function assertNoHorizontalOverflow(page, label) {
  const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }))
  assert(dimensions.document <= dimensions.viewport + 1, `${label} document overflow: ${JSON.stringify(dimensions)}`)
  assert(dimensions.body <= dimensions.viewport + 1, `${label} body overflow: ${JSON.stringify(dimensions)}`)
  record(`${label} 无横向溢出`)
}

const browser = await chromium.launch({ executablePath: browserPath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-CN' })
  const page = await context.newPage()
  watchPage(page, 'desktop')

  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  await page.locator('.home-hero').waitFor()
  assert((await page.locator('body').innerText()).includes('卷宗 0001—0142'))
  record('首页由完整数据渲染')
  await assertNoHorizontalOverflow(page, '桌面首页')

  const runtimeResearchCoverage = await page.evaluate(async () => {
    const { events } = await import('/lib/events.ts')
    const coreFields = ['summary', 'initialNarrative', 'publicQuestion', 'mediaRole', 'investigation', 'finalConclusion', 'historianNote']
    const evidenceFields = ['verifiedFacts', 'disputedClaims', 'debunkedClaims', 'unresolvedQuestions', 'timeline', 'propagationChain']
    return {
      total: events.length,
      incompleteStatus: events.filter((event) => event.researchStatus === 'untouched' || event.researchStatus === 'researching').length,
      missingCore: events.filter((event) => coreFields.some((field) => typeof event[field] !== 'string' || !event[field].trim())).length,
      missingEvidence: events.filter((event) => evidenceFields.some((field) => !Array.isArray(event[field]))).length,
      missingSequence: events.filter((event) => event.timeline.length === 0 || event.propagationChain.length === 0).length,
    }
  })
  assert.deepEqual(runtimeResearchCoverage, { total: 142, incompleteStatus: 0, missingCore: 0, missingEvidence: 0, missingSequence: 0 })
  record('前端运行时合并全部 11 批次的 142 条深挖卷宗')

  await page.getByRole('button', { name: '切换至浅色背景' }).click()
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await page.reload({ waitUntil: 'domcontentloaded' })
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light')
  await page.getByRole('button', { name: '切换至深色背景' }).click()
  record('深浅主题切换并持久保存')

  await page.getByRole('link', { name: '检索档案' }).click()
  await page.waitForURL(/\/archive/)
  await page.locator('.filter-panel').waitFor()
  record('首页入口进入档案库')

  await page.locator('.filter-panel .search-field input').fill('武汉大学')
  await page.waitForTimeout(120)
  const searchTitles = await page.locator('.archive-results .event-card h3').allTextContents()
  assert(searchTitles.length >= 2 && searchTitles.every((title) => title.includes('武汉大学')))
  record('全文搜索命中武汉大学相关条目')

  await page.locator('.filter-panel .search-field input').fill('')
  const filterSelects = page.locator('.filter-panel select')
  await filterSelects.nth(0).selectOption('2024')
  await filterSelects.nth(1).selectOption('奸人')
  await page.waitForTimeout(120)
  const filteredCards = page.locator('.archive-results .event-card')
  assert((await filteredCards.count()) > 0)
  const filteredMeta = await filteredCards.locator('.event-card__meta').allTextContents()
  assert(filteredMeta.every((text) => text.includes('奸人') && text.includes('2024')))
  assert(decodeURIComponent(page.url()).includes('category=奸人') && page.url().includes('year=2024'))
  record('年份与卷目组合筛选同步网址')

  const firstHref = await filteredCards.first().locator('.event-card__link').getAttribute('href')
  assert(firstHref)
  await page.goto(`${baseUrl}${firstHref}`)
  await page.locator('.record-header').waitFor()
  const currentEventUrl = page.url()
  await page.locator('.record-header__actions .favorite-button').click()
  assert((await page.locator('.record-header__actions .favorite-button').innerText()).includes('已存私档'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  assert((await page.locator('.record-header__actions .favorite-button').innerText()).includes('已存私档'))
  await page.goto(`${baseUrl}/favorites`)
  await page.locator('.event-card').first().waitFor()
  record('收藏写入 localStorage 且刷新后保留')

  await page.goto(currentEventUrl)
  await page.locator('.record-header').waitFor()
  const beforeKeyboard = page.url()
  await page.keyboard.press('ArrowRight')
  await page.waitForURL((url) => url.toString() !== beforeKeyboard)
  record('详情页方向键切换下一案')

  await page.goto(`${baseUrl}/event/cyber-2024-cj-009`)
  await page.locator('#fact-boundary').waitFor()
  assert.equal(await page.locator('.fact-boundary__group').count(), 4)
  assert((await page.locator('.case-timeline > div').count()) >= 3)
  assert((await page.locator('.propagation-chain > div').count()) >= 3)
  assert((await page.locator('.public-comments article').count()) >= 1)
  assert((await page.locator('.source-meta').count()) >= 3)
  assert((await page.locator('.source-refs a').count()) >= 1)
  await page.locator('.source-refs a').first().click()
  assert(page.url().includes('#source-'))
  record('事实四栏、时间线、传播链、民间留档与史料引文可交互')

  await page.goto(`${baseUrl}/event/cyber-2026-eq-040`)
  await page.locator('#fact-boundary').waitFor()
  assert.equal(await page.locator('.record-chapter').count(), 3)
  assert((await page.locator('#shimo').innerText()).includes('饭圈称谓'))
  assert((await page.locator('.archive-state').innerText()).includes('续考'))
  assert.equal(await page.locator('.research-meter').count(), 0)
  assert.equal(await page.locator('.source-list > *').count(), 4)
  record('OPPO 第九批卷宗显示史书四层结构、非数字编纂状态和四条史料')

  await page.goto(`${baseUrl}/event/cyber-2016-eq-002`)
  await page.locator('#mutual-reference').waitFor()
  const mutualHref = await page.locator('#mutual-reference a').getAttribute('href')
  assert.equal(mutualHref, '/event/cyber-2016-yc-001')
  record('同案异卷按人工 caseId 互相参照')

  await page.goto(`${baseUrl}/event/cyber-2026-jr-036`)
  await page.locator('.controversy-alert').waitFor()
  assert((await page.locator('.archive-state').innerText()).includes('疑传'))
  assert((await page.locator('.sources').innerText()).includes('所据：技术背景'))
  record('争议卷宗显示警示、疑传状态和来源用途')

  await page.goto(`${baseUrl}/graph`)
  await page.locator('.network-canvas svg[role="img"]').waitFor()
  await page.locator('.graph-toolbar select').first().selectOption('食品安全')
  await page.waitForTimeout(120)
  assert((await page.locator('.graph-node--event').count()) > 2)
  await page.locator('.graph-node--category').first().click()
  assert((await page.locator('.graph-inspector a').count()) > 0)
  record('档案关系索引按主题重算并可点击高亮')

  await page.goto(`${baseUrl}/statistics`)
  await page.locator('.chart-panel svg').first().waitFor()
  assert((await page.locator('.chart-panel svg').count()) >= 4)
  record('统计图表由事件数据渲染')

  await page.goto(baseUrl)
  const randomButton = page.getByRole('button', { name: /后人鉴之/ }).first()
  await randomButton.click()
  await page.waitForURL(/\/event\//)
  assert(sourceEvents.some((event) => page.url().endsWith(event.id)))
  record('随机翻史打开真实事件')

  await context.close()

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-CN' })
  const mobile = await mobileContext.newPage()
  watchPage(mobile, 'mobile')
  for (const [path, label] of [['/', '移动首页'], ['/archive', '移动档案库'], ['/graph', '移动关系图谱'], ['/event/cyber-2024-cj-009', '移动深挖卷宗']]) {
    await mobile.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' })
    await mobile.locator('main').waitFor()
    await assertNoHorizontalOverflow(mobile, label)
  }
  await mobile.goto(baseUrl)
  await mobile.locator('.menu-toggle').click()
  assert(await mobile.locator('.mobile-nav').isVisible())
  await mobile.getByRole('button', { name: /索引/ }).last().click()
  await mobile.locator('.search-dialog input').fill('食品安全')
  assert((await mobile.locator('.search-results > button').count()) > 0)
  record('移动菜单与搜索弹层可触控使用')
  await mobileContext.close()

  assert.equal(failures.length, 0, failures.join('\n'))
  process.stdout.write(`\n${checks.length} 项浏览器烟测全部通过。\n`)
} finally {
  await browser.close()
}
