import { randomBytes, createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'

// No password or administrator role is checked into the repository. This creates
// a one-use, 24-hour activation capability; D1 stores only its SHA-256 hash.
const directory = new URL('../.wrangler/private/', import.meta.url)
const token = randomBytes(32).toString('base64url')
const expires = Math.floor(Date.now() / 1000) + 86400
const origin = (process.env.CYBER_ARCHIVE_URL ?? 'https://cyber-records-of-the-grand-historian.cyber-records-of-the-grand-historian.workers.dev').replace(/\/$/u, '')
const link = `${origin}/admin/setup#setup=${token}`
await mkdir(directory, { recursive: true })
await writeFile(new URL('admin-setup.sql', directory), `INSERT INTO app_settings(key,value) SELECT 'admin_setup_hash','${createHash('sha256').update(token).digest('hex')}' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE role='admin') ON CONFLICT(key) DO UPDATE SET value=excluded.value;\nINSERT INTO app_settings(key,value) SELECT 'admin_setup_expires','${expires}' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE role='admin') ON CONFLICT(key) DO UPDATE SET value=excluded.value;\n`, 'utf8')
await writeFile(new URL('admin-setup.html', directory), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width,initial-scale=1"><title>赛博史记 · 管理员激活</title><style>body{max-width:640px;margin:12vh auto;padding:24px;background:#eee9df;color:#191b1a;font:18px/1.9 serif}a{display:inline-block;padding:14px 28px;background:#80622e;color:#fff;text-decoration:none}small{display:block;margin-top:24px;color:#52534e}</style><h1>赛博史记 · 开馆授印</h1><p>此链接用于首次创建管理员账号，仅能成功使用一次，24小时后失效。请勿分享此文件。</p><a rel="noreferrer" href="${link}">激活管理员账号</a><small>如果已存在管理员账号，此链接无法再次授予权限。</small></html>`, 'utf8')
console.log('已生成 .wrangler/private/admin-setup.sql 和 admin-setup.html（已被 Git 忽略）。')
console.log('将 SQL 应用到目标 D1 后，由网站所有者打开 HTML 创建管理员。链接未输出到日志。')
