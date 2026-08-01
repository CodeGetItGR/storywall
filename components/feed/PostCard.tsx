'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MessageCircle, MoreHorizontal, Pin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn, initialsFromName, avatarColorFromId } from '@/lib/utils'
import type { PostResponseDto } from '@/lib/api/types'
import Avatar from '@/components/ui/avatar'

interface PostCardProps {
  post: PostResponseDto
  showCommentLink?: boolean
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

export function PostCard({ post, showCommentLink = true }: PostCardProps) {
  const t = useTranslations('PostCard')
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.reactionCount)

  const authorName = post.author?.displayName ?? t('unknownAuthor')
  const authorSubtitle = post.author?.nickname ?? post.author?.role
  const timeAgo = timeAgoParts(post.createdAt)
  const media = post.media

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
            src={post.author?.avatarUrl}
            initials={initialsFromName(authorName)}
            color={avatarColorFromId(post.author?.memberId ?? post.id)}
            size="md"
            alt={authorName}
          />
          <div>
            <p className="text-sm font-semibold text-ink group-hover:text-primary transition-colors leading-tight">
              {authorName}
            </p>
            <div className="flex items-center gap-1.5">
              {authorSubtitle && <span className="text-xs text-ink-muted capitalize">{authorSubtitle}</span>}
              {authorSubtitle && <span className="text-ink-faint text-xs">·</span>}
              <span className="text-xs text-ink-muted">
                {timeAgo.unit === 'now' ? t('justNow') : t(`timeAgo.${timeAgo.unit}`, { count: timeAgo.value })}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          {post.isPinned && (
            <span
              className="w-8 h-8 flex items-center justify-center rounded-full text-primary"
              aria-label={t('pinned')}
              title={t('pinned')}
            >
              <Pin className="w-4 h-4" strokeWidth={1.8} />
            </span>
          )}
          <button
            aria-label={t('moreOptions')}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-faint transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-sm text-ink leading-relaxed">{post.content}</p>
        </div>
      )}

      {/* Media */}
      {media.length === 1 && (
        <div className="relative w-full aspect-4/3 bg-surface-muted overflow-hidden">
          <Image
            src={media[0].mediaUrl}
            alt={t('photoBy', { name: authorName })}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 680px"
          />
        </div>
      )}
      {media.length > 1 && (
        <div className="grid grid-cols-2 gap-0.5 bg-surface-muted">
          {media.slice(0, 4).map((item, i) => (
            <div key={item.id} className="relative aspect-square overflow-hidden">
              <Image
                src={item.mediaUrl}
                alt={t('photoBy', { name: authorName })}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 340px"
              />
              {i === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-ink/50 flex items-center justify-center text-white text-lg font-semibold">
                  +{media.length - 4}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          {/* Like */}
          <button
            onClick={handleLike}
            aria-label={liked ? t('unlikePost') : t('likePost')}
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
              aria-label={t('comments', { count: post.commentCount })}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </Link>
          ) : (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              aria-label={t('comments', { count: post.commentCount })}
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              <span className="tabular-nums">{post.commentCount}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
