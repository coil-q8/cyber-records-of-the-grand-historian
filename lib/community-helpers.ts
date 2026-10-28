import type { useAccount } from './account'
export type ReturnTypeOfAccount = ReturnType<typeof useAccount>
export const formatDateTime = (date: string | null | undefined) => date ? new Date(date).toLocaleString('zh-CN', { hour12: false }) : '—'
