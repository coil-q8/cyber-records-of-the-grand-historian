import { randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
const directory = new URL('../.wrangler/private/', import.meta.url)
const id = randomUUID(), username = `qa_cloud_${randomBytes(6).toString('hex')}`, password = randomBytes(32).toString('base64url')
const salt = randomBytes(16).toString('hex')
const encoded = `scrypt-32768-8-3$${salt}$${scryptSync(password, salt, 32, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }).toString('hex')}`
await mkdir(directory, { recursive: true })
await writeFile(new URL('cloud-smoke-admin.sql', directory), `INSERT INTO accounts(id,username,display_name,password_hash,recovery_hash,role,created_at) VALUES ('${id}','${username}','临时云端验收管理员','${encoded}','disabled-recovery','admin','${new Date().toISOString()}');\n`, 'utf8')
await writeFile(new URL('cloud-smoke-admin.json', directory), JSON.stringify({ id, username, password }), 'utf8')
await writeFile(new URL('cloud-smoke-username.txt', directory), username, 'utf8')
await writeFile(new URL('cloud-smoke-password.txt', directory), password, 'utf8')
console.log('已在 .wrangler/private/ 生成临时验收管理员 SQL 和凭据文件。测试后应按ID清理账号并删除对应CI secret。')
