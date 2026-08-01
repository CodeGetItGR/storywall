import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { cn, initialsFromName, avatarColorFromId } from '@/lib/utils'
import type { EventMemberResponseDto } from '@/lib/api/types'
import type { StoryGroup } from '@/lib/stories'
import Avatar from '@/components/ui/avatar'

interface StoryAvatarProps {
  group: StoryGroup
  member: EventMemberResponseDto
  isCurrentUser?: boolean
}

export function StoryAvatar({ group, member, isCurrentUser }: StoryAvatarProps) {
  const t = useTranslations('StoryAvatar')
  const firstStoryId = group.stories[0].id

  return (
    <Link
      href={`/story/${firstStoryId}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
      aria-label={isCurrentUser ? t('yourStory') : t('userStory', { name: member.displayName })}
    >
      <div
        className={cn(
          'w-15.5 h-15.5 rounded-full p-0.75 flex items-center justify-center',
          group.allSeen ? 'bg-border' : 'bg-gradient-brand',
        )}
        aria-hidden="true"
      >
        <div className="w-full h-full rounded-full p-0.5 bg-background flex items-center justify-center">
          <Avatar
            initials={initialsFromName(member.displayName)}
            color={avatarColorFromId(member.id)}
            size="xl"
            alt={member.displayName}
            className="w-full h-full"
          />
        </div>
      </div>

      <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
        {isCurrentUser ? t('yourStory') : member.displayName.split(' ')[0]}
      </span>
    </Link>
  )
}
