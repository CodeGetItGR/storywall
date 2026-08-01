'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Send, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePost, usePostComments, useCreateComment, useEventMembers } from '@/hooks'
import { useActiveMember } from '@/providers/EventProvider'
import { PostCard } from '@/components/feed/PostCard'
import Avatar from '@/components/ui/avatar'
import { ApiError } from '@/lib/api/client'
import { initialsFromName, avatarColorFromId } from '@/lib/utils'

interface PostModalProps {
  postId: string
  onClose: () => void
}

function timeAgoParts(dateStr: string): { unit: 'now' | 'minutes' | 'hours' | 'days'; value: number } {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return { unit: 'now', value: 0 }
  if (diff < 3600) return { unit: 'minutes', value: Math.floor(diff / 60) }
  if (diff < 86400) return { unit: 'hours', value: Math.floor(diff / 3600) }
  return { unit: 'days', value: Math.floor(diff / 86400) }
}

export function PostModal({ postId, onClose }: PostModalProps) {
  const t = useTranslations('PostModal')
  const activeMember = useActiveMember()
  const { data: post, error, isPending } = usePost(postId)
  const { data: comments = [] } = usePostComments(postId)
  const { data: members = [] } = useEventMembers(post?.eventId ?? null)
  const createComment = useCreateComment(post?.eventId ?? '')
  const [commentText, setCommentText] = useState('')

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!commentText.trim() || !post || !activeMember) return
    createComment.mutate({
      postId: post.id,
      authorMemberId: activeMember.id,
      content: commentText.trim(),
    })
    setCommentText('')
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3">
          <h2 className="text-base font-bold text-ink">{t('title')}</h2>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

        {error instanceof ApiError && error.status === 404 && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
            <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
          </div>
        )}

        {post && (
          <>
            <div className="px-4 pt-4">
              <PostCard post={post} showCommentLink={false} />
            </div>

            <div className="px-4 pt-5 pb-4">
              <h3 className="text-sm font-bold text-ink mb-4">
                {comments.length === 0 ? t('noCommentsYet') : t('commentCount', { count: comments.length })}
              </h3>

              <div className="flex flex-col gap-4">
                {comments.map(comment => {
                  const author = comment.authorMemberId ? membersById.get(comment.authorMemberId) : undefined
                  const name = author?.displayName ?? t('unknownAuthor')
                  const timeAgo = timeAgoParts(comment.createdAt)

                  return (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar
                        initials={initialsFromName(name)}
                        color={avatarColorFromId(comment.authorMemberId ?? comment.id)}
                        size="sm"
                        alt={name}
                        className="shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="bg-surface-muted rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-sm font-semibold text-ink leading-tight">{name}</span>
                            <span className="text-xs text-ink-faint">
                              {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
                            </span>
                          </div>
                          <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex items-center gap-3"
            >
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t('commentPlaceholder')}
                aria-label={t('commentTextAriaLabel')}
                className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || createComment.isPending}
                aria-label={t('postComment')}
                className="text-primary disabled:text-ink-faint transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
