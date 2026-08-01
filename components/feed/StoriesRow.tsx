'use client'

import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useActiveMember } from '@/providers/EventProvider'
import { useCreateStory, useEventMembers, useEventStories, useUploadMedia } from '@/hooks'
import { groupStoriesByAuthor } from '@/lib/stories'
import { StoryAvatar } from './StoryAvatar'

interface StoriesRowProps {
  eventId: string
}

export function StoriesRow({ eventId }: StoriesRowProps) {
  const t = useTranslations('StoriesRow')
  const tAvatar = useTranslations('StoryAvatar')
  const router = useRouter()
  const activeMember = useActiveMember()
  const { data: stories = [] } = useEventStories(eventId)
  const { data: members = [] } = useEventMembers(eventId)
  const uploadMedia = useUploadMedia()
  const createStory = useCreateStory()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isBusy = uploadMedia.isPending || createStory.isPending

  const groups = useMemo(() => groupStoriesByAuthor(stories), [stories])
  const membersById = useMemo(() => new Map(members.map(m => [m.id, m])), [members])

  const ownGroup = activeMember ? groups.find(g => g.authorMemberId === activeMember.id) : undefined
  const otherGroups = groups.filter(g => g.authorMemberId !== activeMember?.id)

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !activeMember) return

    setUploadError(null)
    try {
      const media = await uploadMedia.mutateAsync({
        eventId,
        file,
        mediaType: 'IMAGE',
        uploaderMemberId: activeMember.id,
      })
      const story = await createStory.mutateAsync({
        eventId,
        authorMemberId: activeMember.id,
        mediaId: media.id,
      })
      router.push(`/story/${story.id}`)
    } catch {
      setUploadError(t('uploadFailed'))
    }
  }

  return (
    <section
      aria-label={t('ariaLabel')}
      className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 py-4"
    >
      {/* Current user slot */}
      {ownGroup && activeMember ? (
        <StoryAvatar group={ownGroup} member={activeMember} isCurrentUser />
      ) : (
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!activeMember || isBusy}
            aria-label={tAvatar('addYourStory')}
            className="relative w-15.5 h-15.5 flex items-center justify-center disabled:opacity-60"
          >
            <Image
              src="/assets/StoryAvatar.svg"
              alt=""
              className="w-full h-full object-cover rounded-xl"
              width={150}
              height={150}
            />
          </button>
          <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
            {tAvatar('yourStory')}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
            disabled={!activeMember || isBusy}
            aria-label={tAvatar('addYourStory')}
            tabIndex={-1}
          />
        </div>
      )}

      {uploadError && (
        <p role="alert" className="text-xs text-destructive shrink-0 self-center max-w-32">
          {uploadError}
        </p>
      )}

      {/* Divider */}
      <div className="w-px h-14 bg-border self-center shrink-0" aria-hidden="true" />

      {/* Other stories */}
      {otherGroups.map(group => {
        const member = membersById.get(group.authorMemberId)
        if (!member) return null
        return <StoryAvatar key={group.authorMemberId} group={group} member={member} />
      })}
    </section>
  )
}
