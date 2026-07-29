'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Send } from 'lucide-react'
import { posts, comments as allComments, users, CURRENT_USER_ID, getUser } from '@/lib/mock-data'
import Avatar from '@/components/ui/avatar'
import {PostCard} from '@/components/feed/PostCard'
import { cn } from '@/lib/utils'
import type { Comment } from '@/lib/types'

function timeAgo(dateStr: string): string {
  const now = new Date('2025-07-11T12:00:00Z').getTime()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const post = posts.find(p => p.id === id) ?? posts[0]
  const postComments = allComments.filter(c => c.postId === post.id)
  const currentUser = getUser(CURRENT_USER_ID)

  const [localComments, setLocalComments] = useState<Comment[]>(postComments)
  const [commentText, setCommentText] = useState('')
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set())

  function handleLikeComment(cId: string) {
    setLikedComments(prev => {
      const next = new Set(prev)
      if (next.has(cId)) next.delete(cId)
      else next.add(cId)
      return next
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    const newComment: Comment = {
      id: `c-new-${Date.now()}`,
      userId: CURRENT_USER_ID,
      postId: post.id,
      content: commentText.trim(),
      createdAt: new Date().toISOString(),
      likes: 0,
    }
    setLocalComments(prev => [...prev, newComment])
    setCommentText('')
  }

  return (
    <div className="max-w-2xl mx-auto pb-28 lg:pb-8">
      {/* Back bar */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink">Post</h1>
      </div>

      {/* The post — no comment link */}
      <div className="px-4 pt-4">
        <PostCard post={post} showCommentLink={false} />
      </div>

      {/* Comments section */}
      <div className="px-4 pt-5">
        <h2 className="text-sm font-bold text-ink mb-4">
          {localComments.length === 0 ? 'No comments yet' : `${localComments.length} Comment${localComments.length !== 1 ? 's' : ''}`}
        </h2>

        <div className="flex flex-col gap-4">
          {localComments.map(comment => {
            const commentUser = users.find(u => u.id === comment.userId)
            if (!commentUser) return null
            const liked = likedComments.has(comment.id)
            const likeCount = comment.likes + (liked ? 1 : 0)

            return (
              <div key={comment.id} className="flex gap-3">
                <Avatar
                  initials={commentUser.initials}
                  color={commentUser.avatarColor}
                  size="sm"
                  alt={commentUser.name}
                  className="shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-surface-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink leading-tight">{commentUser.name}</span>
                      <span className="text-xs text-ink-faint">{timeAgo(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-ink leading-relaxed">{comment.content}</p>
                  </div>
                  <button
                    onClick={() => handleLikeComment(comment.id)}
                    aria-pressed={liked}
                    aria-label={liked ? 'Unlike comment' : 'Like comment'}
                    className={cn(
                      'flex items-center gap-1 mt-1.5 ml-3 text-xs font-medium transition-colors',
                      liked ? 'text-primary' : 'text-ink-faint hover:text-ink-muted',
                    )}
                  >
                    <Heart
                      className={cn('w-3.5 h-3.5', liked ? 'fill-primary' : '')}
                      strokeWidth={liked ? 0 : 1.8}
                    />
                    {likeCount > 0 && <span className="tabular-nums">{likeCount}</span>}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reply input — sticky bottom */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 lg:left-55 xl:right-75 bg-background/95 backdrop-blur-sm border-t border-border px-4 py-3 z-20">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <Avatar initials={currentUser.initials} color={currentUser.avatarColor} size="sm" alt={currentUser.name} />
            <div className="flex-1 flex items-center gap-2 bg-surface-muted rounded-full px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) handleSubmit(e as unknown as React.FormEvent)
                }}
                placeholder="Add a comment..."
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
                aria-label="Comment text"
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                aria-label="Post comment"
                className="text-primary disabled:text-ink-faint transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
