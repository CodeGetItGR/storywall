'use client'

import React, { use, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Eye, MoreVertical, Music, X } from 'lucide-react'
import {
  useDeleteStory,
  useEventMembers,
  useEventStories,
  useMarkStoryViewed,
  useMediaItem,
  useStory,
  useStoryViews,
} from '@/hooks'
import { useActiveMember, useIsHost } from '@/providers/EventProvider'
import { groupStoriesByAuthor } from '@/lib/stories'
import { Modal } from '@/components/ui/modal'
import Avatar from '@/components/ui/avatar'
import { ApiError } from '@/lib/api/client'
import { avatarColorFromId, initialsFromName } from '@/lib/utils'

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('StoryPage')
  const locale = useLocale()
  const { id } = use(params)
  const router = useRouter()
  const activeMember = useActiveMember()
  const isHost = useIsHost()

  const { data: story, error: storyError } = useStory(id)
  const eventId = story?.eventId ?? null
  const { data: media } = useMediaItem(story?.mediaId ?? null)
  const { data: allStories = [] } = useEventStories(eventId)
  const { data: members = [] } = useEventMembers(eventId)
  const markViewed = useMarkStoryViewed()
  const deleteStory = useDeleteStory(eventId ?? '')

  const [progress, setProgress] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const groups = useMemo(() => groupStoriesByAuthor(allStories, { filterExpired: false }), [allStories])
  const groupIndex = groups.findIndex(g => g.stories.some(s => s.id === id))
  const group = groupIndex >= 0 ? groups[groupIndex] : null
  const storyIndex = group ? group.stories.findIndex(s => s.id === id) : -1

  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])
  const author = story?.authorMemberId ? membersById.get(story.authorMemberId) : undefined
  const canManage = Boolean(story && activeMember && (activeMember.id === story.authorMemberId || isHost))

  const { data: viewers = [], isFetching: viewersLoading } = useStoryViews(showViewers ? id : null)

  // Mark viewed once per opened story. Idempotent server-side, so no
  // client-side "already sent" guard is needed.
  useEffect(() => {
    markViewed.mutate(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Auto-advance progress bar. Deliberately keyed on `id` alone (not
  // `group`/`groupIndex`, which are recomputed whenever useEventStories
  // background-refetches) so a refetch mid-story doesn't reset progress.
  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          goNext()
          return 100
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (storyError instanceof ApiError && storyError.status === 404) {
    router.replace('/feed')
    return null
  }

  if (!story || !group || storyIndex < 0) return null

  function goNext() {
    if (!group) return
    if (storyIndex < group.stories.length - 1) {
      router.replace(`/story/${group.stories[storyIndex + 1].id}`)
      return
    }
    const nextGroup = groups[groupIndex + 1]
    if (nextGroup) {
      router.replace(`/story/${nextGroup.stories[0].id}`)
    } else {
      router.replace('/feed')
    }
  }

  function goPrev() {
    if (!group) return
    if (storyIndex > 0) {
      router.replace(`/story/${group.stories[storyIndex - 1].id}`)
      return
    }
    const prevGroup = groups[groupIndex - 1]
    if (prevGroup) {
      router.replace(`/story/${prevGroup.stories[prevGroup.stories.length - 1].id}`)
    }
  }

  async function handleDelete() {
    setShowMenu(false)
    await deleteStory.mutateAsync(id)
    goNext()
  }

  const timeStr = new Date(story.createdAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
  const authorName = author?.displayName ?? t('unknownAuthor')

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm h-full max-h-dvh bg-black overflow-hidden">
        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
          {group.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
          <div className="flex items-center gap-2.5">
            <Avatar
              initials={initialsFromName(authorName)}
              color={avatarColorFromId(story.authorMemberId ?? story.id)}
              size="sm"
              alt={authorName}
              className="border-2 border-white/60"
            />
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{authorName}</p>
              <p className="text-white/60 text-xs leading-tight">{timeStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => setShowMenu(v => !v)}
                aria-label={t('moreOptions')}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => router.back()}
              aria-label={t('closeStory')}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {canManage && showMenu && (
          <div className="absolute top-16 right-4 z-30 bg-background rounded-xl shadow-lg overflow-hidden">
            <button
              onClick={handleDelete}
              disabled={deleteStory.isPending}
              className="px-4 py-2.5 text-sm text-destructive hover:bg-surface-muted transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {t('deleteStory')}
            </button>
          </div>
        )}

        {/* Image */}
        {media && (
          <Image
            src={media.mediaUrl}
            alt={t('userStory', { name: authorName })}
            fill
            className="object-cover"
            sizes="400px"
            priority
          />
        )}

        {/* Tap zones */}
        <button onClick={goPrev} className="absolute left-0 top-0 w-1/3 h-full z-10" aria-label={t('previousStory')} />
        <button onClick={goNext} className="absolute right-0 top-0 w-1/3 h-full z-10" aria-label={t('nextStory')} />

        {/* Nav arrows — desktop hint */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goPrev} aria-label={t('previous')} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goNext} aria-label={t('next')} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Caption / song / viewed-by bar */}
        {(story.caption || story.songUrl || canManage) && (
          <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent flex flex-col gap-2">
            {story.caption && <p className="text-white text-sm">{story.caption}</p>}
            {story.songUrl && (
              <a
                href={story.songUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit"
              >
                <Music className="w-3.5 h-3.5" />
                {t('listenToSong')}
              </a>
            )}
            {canManage && (
              <button
                type="button"
                onClick={() => setShowViewers(true)}
                className="inline-flex items-center gap-1.5 text-white/80 text-xs w-fit"
              >
                <Eye className="w-3.5 h-3.5" />
                {t('viewedBy')}
              </button>
            )}
          </div>
        )}
      </div>

      <Modal open={showViewers} onClose={() => setShowViewers(false)} size="sm" closeLabel={t('close')}>
        <div className="px-4 py-4">
          <h2 className="text-sm font-bold text-ink mb-3">
            {viewersLoading ? t('loadingViewers') : t('viewedByCount', { count: viewers.length })}
          </h2>
          {!viewersLoading && viewers.length === 0 && <p className="text-sm text-ink-muted">{t('noViewers')}</p>}
          <div className="flex flex-col gap-3">
            {viewers.map(v => {
              const m = membersById.get(v.memberId)
              const name = m?.displayName ?? t('unknownAuthor')
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <Avatar initials={initialsFromName(name)} color={avatarColorFromId(v.memberId)} size="sm" alt={name} />
                  <span className="text-sm text-ink">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Modal>
    </div>
  )
}
