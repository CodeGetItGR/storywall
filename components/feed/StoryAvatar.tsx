import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Story, User } from '@/lib/types'
import Image from "next/image";

interface StoryAvatarProps {
  story: Story
  user: User
  isCurrentUser?: boolean
}

export function StoryAvatar({ story, user, isCurrentUser }: StoryAvatarProps) {
  return (
    <Link
      href={isCurrentUser ? '/new-post' : `/story/${story.id}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
      aria-label={isCurrentUser ? 'Add your story' : `${user.name}'s story`}
    >
      <div className="relative">
        {/* Gradient ring wrapper */}
        {!isCurrentUser ? (
          <div
            className={cn(
              'w-15.5 h-15.5 rounded-full p-0.75 flex items-center justify-center',
              story.seen ? 'bg-border' : 'bg-gradient-brand',
            )}
            aria-hidden="true"
          >
            <div className="w-full h-full rounded-full p-0.5 bg-background flex items-center justify-center">
              <div
                className="w-full h-full rounded-full flex items-center justify-center font-semibold text-white text-sm select-none"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.initials}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative w-15.5 h-15.5 flex items-center justify-center">
            <Image src={'/assets/StoryAvatar.svg'} alt="Banner" className="w-full h-full object-cover rounded-xl" width={150} height={150}/>
          </div>
        )}
      </div>

      <span className="text-[11px] text-ink-muted font-medium text-center leading-tight max-w-14 truncate">
        {isCurrentUser ? 'Your story' : user.name.split(' ')[0]}
      </span>
    </Link>
  )
}
