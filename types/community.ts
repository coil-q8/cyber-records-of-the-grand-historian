export type SubmissionStatus = 'draft' | 'pending' | 'approved' | 'rejected'
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128
export interface Account { id: string; username: string; displayName: string; role: 'member' | 'admin' }
export interface SessionInfo { user: Account | null; csrfToken: string | null }
export interface ArticleSource { title: string; url: string }
export interface ArticleInput {
  title: string; category: string; eventDate: string; summary: string; body: string; sources: ArticleSource[]; tags: string[]
}
export interface CommunityArticle extends ArticleInput {
  id: string; authorName: string; publishedAt: string; updatedAt: string; version: number
}
export interface Submission extends ArticleInput {
  id: string; authorId: string; authorName: string; status: SubmissionStatus; version: number
  reviewNote: string; createdAt: string; updatedAt: string; submittedAt: string | null
  reviewedAt: string | null; publishedVersion: number | null
}
export interface ReviewEntry { id: string; action: 'approve' | 'reject' | 'unpublish'; note: string; version: number; createdAt: string; reviewerName: string }
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number }
export const submissionLabels: Record<SubmissionStatus, string> = { draft: '草稿', pending: '待审核', approved: '已通过', rejected: '退回修改' }
