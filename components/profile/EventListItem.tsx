'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import type { EventDetailResponseDto, EventMemberResponseDto } from '@/lib/api/types'

interface EventListItemProps {
  eventId: string
  member: EventMemberResponseDto
  event: EventDetailResponseDto | undefined
  isLoading: boolean
}

export function EventListItem({ eventId, member, event, isLoading }: EventListItemProps) {
  const t = useTranslations('ProfilePage')

  const roleLabel =
    member.customRelationshipRole ??
    member.relationshipRole ??
    (member.role === 'HOST' ? t('roleFallback.host') : t('roleFallback.attendee'))

  return (
    <Link
      href={`/feed/${eventId}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors"
    >
      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-surface-muted shrink-0">
        {isLoading ? (
          <div className="absolute inset-0 animate-pulse bg-surface-muted" />
        ) : event?.coverMedia?.mediaUrl ? (
          <Image
            src={event.coverMedia.mediaUrl}
            alt={event.title}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-brand flex items-center justify-center">
            <Heart className="w-4 h-4 text-white/80" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isLoading ? (
          <div className="h-4 w-32 bg-surface-muted rounded animate-pulse" />
        ) : (
          <p className="text-sm font-medium text-ink truncate leading-tight">
            {event?.title ?? t('eventUnavailable')}
          </p>
        )}
        <p className={cn('text-xs text-ink-muted truncate', isLoading ? 'mt-2' : 'mt-0.5')}>{roleLabel}</p>
      </div>

      <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
    </Link>
  )
}
