'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, Settings, Grid3x3, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { posts, users, CURRENT_USER_ID, getUser } from '@/lib/mock-data'
import Avatar from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type ProfileTab = 'posts' | 'liked'

export default function ProfilePage() {
  const t = useTranslations('ProfilePage')
  const router = useRouter()
  const user = getUser(CURRENT_USER_ID)
  const [tab, setTab] = useState<ProfileTab>('posts')

  const userPosts = posts.filter(p => p.userId === user.id)
  const likedPosts = posts.filter(p => p.liked)

  const displayPosts = tab === 'posts' ? userPosts : likedPosts

  const roleLabel: Record<string, string> = {
    bride: t('roles.bride'),
    groom: t('roles.groom'),
    guest: t('roles.guest'),
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <button
          onClick={() => router.back()}
          aria-label={t('goBack')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink">{user.username}</h1>
        <button
          aria-label={t('settings')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile info */}
      <div className="px-4 pb-6">
        <div className="flex items-start gap-5 mb-5">
          <Avatar initials={user.initials} color={user.avatarColor} size="2xl" alt={user.name} />
          <div className="flex-1 pt-1">
            <h2 className="text-xl font-bold text-ink leading-tight">{user.name}</h2>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-primary-light text-primary-dark text-xs font-semibold capitalize">
              {roleLabel[user.role] ?? user.role}
            </span>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">{user.bio}</p>

            {/* Stats */}
            <div className="flex gap-5 mt-3">
              <div className="text-center">
                <p className="text-base font-bold text-ink tabular-nums">{user.postCount}</p>
                <p className="text-xs text-ink-muted">{t('stats.posts')}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-ink tabular-nums">{user.followers}</p>
                <p className="text-xs text-ink-muted">{t('stats.followers')}</p>
              </div>
              <div className="text-center">
                <p className="text-base font-bold text-ink tabular-nums">{user.following}</p>
                <p className="text-xs text-ink-muted">{t('stats.following')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit profile button */}
        <button className="w-full py-2 rounded-full border border-border text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors">
          {t('editProfile')}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-y border-border flex">
        <button
          onClick={() => setTab('posts')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
            tab === 'posts' ? 'text-ink border-b-2 border-ink' : 'text-ink-faint hover:text-ink-muted',
          )}
        >
          <Grid3x3 className="w-4 h-4" strokeWidth={1.8} />
          {t('tabs.posts')}
        </button>
        <button
          onClick={() => setTab('liked')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
            tab === 'liked' ? 'text-ink border-b-2 border-ink' : 'text-ink-faint hover:text-ink-muted',
          )}
        >
          <Heart className="w-4 h-4" strokeWidth={1.8} />
          {t('tabs.liked')}
        </button>
      </div>

      {/* Posts grid */}
      {displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mb-4">
            {tab === 'posts' ? <Grid3x3 className="w-7 h-7 text-ink-faint" /> : <Heart className="w-7 h-7 text-ink-faint" />}
          </div>
          <p className="text-sm font-medium text-ink-muted">{tab === 'posts' ? t('emptyState.posts') : t('emptyState.liked')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 mt-0.5">
          {displayPosts.map(post => (
            <div key={post.id} className="relative aspect-square bg-surface-muted overflow-hidden group cursor-pointer">
              {post.image ? (
                <Image
                  src={post.image}
                  alt={t('postBy', { name: getUser(post.userId).name })}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 640px) 33vw, 200px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-surface-muted p-3">
                  <p className="text-xs text-ink-muted line-clamp-4 text-center">{post.content}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-white text-xs font-semibold">
                  <Heart className="w-4 h-4 fill-white" />
                  {post.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
