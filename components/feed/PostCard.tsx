'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUser } from '@/lib/mock-data'
import type { Post } from '@/lib/types'
import Avatar from '@/components/ui/avatar'

interface PostCardProps {
  post: Post
  showCommentLink?: boolean
}

function timeAgo(dateStr: string): string {
  const now = new Date('2025-07-11T12:00:00Z').getTime()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const [liked, setLiked] = useState(post.liked)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [saved, setSaved] = useState(false)

  const user = getUser(post.userId)

  function handleLike() {
    if (liked) {
      setLiked(false)
      setLikeCount(c => c - 1)
    } else {
      setLiked(true)
      setLikeCount(c => c + 1)
    }
  }

  return (
    <article className="bg-card rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.07)] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href={`/profile`} className="flex items-center gap-3 group">
          <Avatar
            initials={user.initials}
            color={user.avatarColor}
            size="md"
            alt={user.name}
          />
          <div>
            <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors leading-tight">
              {user.name}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-muted capitalize">{user.role}</span>
              <span className="text-ink-faint text-xs">·</span>
              <span className="text-xs text-ink-muted">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </Link>
        <button
          aria-label="More options"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-faint transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-ink leading-relaxed">{post.content}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs text-primary font-medium hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Image */}
      {post.image && (
        <div className="relative w-full aspect-4/3 bg-surface-muted overflow-hidden">
          <Image
            src={post.image}
            alt={`Photo by ${user.name}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 680px"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLike}
            aria-label={liked ? 'Unlike post' : 'Like post'}
            aria-pressed={liked}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              liked
                ? 'text-primary bg-primary-light'
                : 'text-ink-muted hover:bg-surface-muted',
            )}
          >
            <Heart
              className={cn('w-4 h-4', liked ? 'fill-primary text-primary' : '')}
              strokeWidth={liked ? 0 : 1.8}
            />
            <span className="tabular-nums">{likeCount}</span>
          </button>

          {/* Comment */}
          {showCommentLink ? (
            <Link
              href={`/post/${post.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              aria-label={`${post.commentCount} comments`}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </Link>
          ) : (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              aria-label={`${post.commentCount} comments`}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </button>
          )}

          {/* Share */}
          <button
            aria-label="Share post"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
          >
            <Share2 className="w-4 h-4" strokeWidth={1.8} />
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => setSaved(s => !s)}
          aria-label={saved ? 'Unsave post' : 'Save post'}
          aria-pressed={saved}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
            saved ? 'text-primary bg-primary-light' : 'text-ink-faint hover:bg-surface-muted',
          )}
        >
          <Bookmark className={cn('w-4 h-4', saved ? 'fill-primary' : '')} strokeWidth={saved ? 0 : 1.8} />
        </button>
      </div>
    </article>
  )
}
