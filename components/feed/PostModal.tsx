'use client'

import React, { useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { usePost, usePostComments, useCreateComment, useEventMembers, usePostModal } from '@/hooks'
import { useActiveMember } from '@/providers/EventProvider'
import { Modal } from '@/components/ui/modal'
import Avatar from '@/components/ui/avatar'
import { ApiError } from '@/lib/api/client'
import { initialsFromName, avatarColorFromId, timeAgoParts, cn } from '@/lib/utils'
import Image from 'next/image'

export function PostModal() {
  const t = useTranslations('PostModal')
  const tCard = useTranslations('PostCard')
  const { postId, isOpen, close } = usePostModal()
  const activeMember = useActiveMember()
  const { data: post, error, isPending } = usePost(postId)
  const { data: comments = [] } = usePostComments(postId)
  const { data: members = [] } = useEventMembers(post?.eventId ?? null)
  const createComment = useCreateComment(post?.eventId ?? '')
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState<string | null>(null)

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!commentText.trim() || !post || !activeMember) return

    setCommentError(null)

    try {
      await createComment.mutateAsync({
        postId: post.id,
        authorMemberId: activeMember.id,
        content: commentText.trim(),
      })
    } catch {
      setCommentError(t('commentFailed'))
      return
    }

    setCommentText('')
  }

  return (
    <Modal open={isOpen} onClose={close} size="lg" closeLabel={t('close')} className="min-h-[70vh]">
      <div className="top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3 w-full shrink-0">
        <h2 className="text-base font-bold text-ink">{t('title')}</h2>
      </div>

      {isPending && <p className="text-center text-sm text-ink-muted py-16">{t('loading')}</p>}

      {error instanceof ApiError && error.status === 404 && (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <p className="text-base font-semibold text-ink mb-1">{t('notFoundTitle')}</p>
          <p className="text-sm text-ink-muted">{t('notFoundDescription')}</p>
        </div>
      )}

      {post && (
        <section className="w-full grid grid-cols-1 lg:grid-cols-5 flex-1 min-h-0 p-6 overflow-hidden">
          <section className="w-full min-w-0 min-h-0 lg:col-span-3 bg-black rounded-2xl shadow-xl hidden lg:block">
            <Image
              src={post.media[0].mediaUrl}
              alt={tCard('photoBy', { name: post.author?.displayName ?? '' })}
              className="w-full h-full object-center object-scale-down"
              width={150}
              height={150}
            />
          </section>
          <section className="lg:px-4 pt-4 lg:col-span-2 min-w-0 min-h-0 flex flex-col">
            <Modal.Body className={cn('lg:px-4 pt-5 pb-4', { 'flex items-center justify-center': comments.length === 0 })}>
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
            </Modal.Body>

            <form
              onSubmit={handleSubmit}
              className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 flex flex-col items-center gap-3 shrink-0"
            >
              {commentError && (
                <p className="text-xs text-destructive px-4">
                  {commentError}
                </p>
              )}
              <section className="flex gap-3 w-full">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={t('commentPlaceholder')}
                  aria-label={t('commentTextAriaLabel')}
                  className="relative flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 transition"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || createComment.isPending || !activeMember}
                  aria-label={t('postComment')}
                  className="text-primary disabled:text-ink-faint transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </section>
            </form>
          </section>
        </section>
      )}
    </Modal>
  )
}
