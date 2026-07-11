import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Story, User } from '@/lib/types'

interface StoryAvatarProps {
  story: Story
  user: User
  isCurrentUser?: boolean
}

export default function StoryAvatar({ story, user, isCurrentUser }: StoryAvatarProps) {
  return (
    <Link
      href={isCurrentUser ? '/new-post' : `/story/${story.id}`}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
      aria-label={isCurrentUser ? 'Add your story' : `${user.name}'s story`}
    >
      <div className="relative">
        {/* Gradient ring wrapper */}
        {!isCurrentUser ? (
          <div
            className={cn(
              'w-[62px] h-[62px] rounded-full p-[3px] flex items-center justify-center',
              story.seen ? 'bg-border' : 'bg-gradient-brand',
            )}
            aria-hidden="true"
          >
            <div className="w-full h-full rounded-full p-[2px] bg-background flex items-center justify-center">
              <div
                className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white text-sm select-none"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.initials}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-[62px] h-[62px] rounded-full border-2 border-dashed border-border flex items-center justify-center"
            style={{ backgroundColor: user.avatarColor }}
          >
            <span className="font-semibold text-white text-sm select-none">{user.initials}</span>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-brand flex items-center justify-center shadow-sm">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
        )}
      </div>

      <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-[56px] truncate">
        {isCurrentUser ? 'Your story' : user.name.split(' ')[0]}
      </span>
    </Link>
  )
}
