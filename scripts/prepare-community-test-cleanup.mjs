import { readFile, writeFile } from 'node:fs/promises'
const input = process.argv[2] ?? '.wrangler/test-artifacts/community-ids.json'
const ids = JSON.parse(await readFile(input, 'utf8'))
if (process.env.CYBER_INCLUDE_CLOUD_ADMIN === '1') {
  const admin = JSON.parse(await readFile(new URL('../.wrangler/private/cloud-smoke-admin.json', import.meta.url), 'utf8'))
  ids.accounts.push(admin.id)
}
const accounts = [...new Set(ids.accounts)]
if (!accounts.length || accounts.some((id) => !/^[a-f0-9-]{36}$/u.test(id))) throw new Error('拒绝生成清理 SQL：测试账号 ID 不合法。')
const target = `SELECT id FROM accounts WHERE id IN (${accounts.map((id) => `'${id}'`).join(',')}) AND username GLOB 'qa_*'`
const submissions = `SELECT id FROM submissions WHERE author_id IN (${target})`
const sql = [
  `DELETE FROM reviews WHERE submission_id IN (${submissions});`,
  `DELETE FROM published_articles WHERE id IN (${submissions});`,
  `DELETE FROM submissions WHERE author_id IN (${target});`,
  `DELETE FROM sessions WHERE account_id IN (${target});`,
  `DELETE FROM accounts WHERE id IN (${target});`,
].join('\n')
await writeFile(new URL('../.wrangler/private/community-test-cleanup.sql', import.meta.url), sql, 'utf8')
console.log(`已按 ${accounts.length} 个明确测试账号ID生成清理 SQL；同时要求账号名以 qa_ 开头。`)
