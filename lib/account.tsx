import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { SessionInfo } from '../types/community'

export class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }
export async function api<T>(path: string, method = 'GET', data?: unknown, csrfToken?: string | null, signal?: AbortSignal): Promise<T> {
  let response: Response
  try { response = await fetch(path, { method, credentials: 'same-origin', signal, headers: { ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}) }, body: data !== undefined ? JSON.stringify(data) : undefined }) }
  catch (error) { if (error instanceof DOMException && error.name === 'AbortError') throw error; throw new ApiError(0, '暂时无法连接服务，请检查网络后重试。') }
  let value: { error?: string }
  try { value = await response.json() } catch { throw new ApiError(response.status, '账号与投稿服务暂时不可用，请稍后重试。') }
  if (!response.ok) throw new ApiError(response.status, value.error ?? '操作失败，请重试。')
  return value as T
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试。'
const empty: SessionInfo = { user: null, csrfToken: null }
interface AccountContextValue { session: SessionInfo; loading: boolean; error: string; refresh: () => Promise<void>; adopt: (session: SessionInfo) => void; logout: () => Promise<void> }
const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(empty), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef<Promise<void> | null>(null)
  const refresh = useCallback(() => {
    if (pending.current) return pending.current
    setBusy(true); setError('')
    const task = api<SessionInfo>('/api/auth/session').then(setSession).catch((error) => { setSession(empty); setError(errorMessage(error)) }).finally(() => { setLoaded(true); setBusy(false); pending.current = null })
    pending.current = task
    return task
  }, [])
  const adopt = useCallback((value: SessionInfo) => { setSession({ user: value.user, csrfToken: value.csrfToken }); setError(''); setLoaded(true) }, [])
  const logout = async () => { await api('/api/auth/logout', 'POST', {}, session.csrfToken); adopt(empty) }
  return <AccountContext.Provider value={{ session, loading: !loaded || busy, error, refresh, adopt, logout }}>{children}</AccountContext.Provider>
}
export function useAccount() {
  const value = useContext(AccountContext)
  if (!value) throw new Error('AccountProvider is required')
  const { refresh } = value
  useEffect(() => { void refresh() }, [refresh])
  return value
}
