import { stories, users, CURRENT_USER_ID, getUser } from '@/lib/mock-data'
import StoryAvatar from './story-avatar'

export default function StoriesRow() {
  const currentUser = getUser(CURRENT_USER_ID)

  // Current user's story (or "add story" slot)
  const currentUserStory = stories.find(s => s.userId === CURRENT_USER_ID)

  // Other users' stories, sorted: unseen first
  const otherStories = stories
    .filter(s => s.userId !== CURRENT_USER_ID)
    .sort((a, b) => Number(a.seen) - Number(b.seen))

  return (
    <section
      aria-label="Stories"
      className="flex items-start gap-4 overflow-x-auto no-scrollbar px-4 py-4"
    >
      {/* Current user slot */}
      <StoryAvatar
        story={currentUserStory ?? {
          id: 'new',
          userId: CURRENT_USER_ID,
          image: '',
          seen: false,
          createdAt: '',
        }}
        user={currentUser}
        isCurrentUser
      />

      {/* Divider */}
      <div className="w-px h-14 bg-border self-center flex-shrink-0" aria-hidden="true" />

      {/* Other stories */}
      {otherStories.map(story => {
        const user = users.find(u => u.id === story.userId)
        if (!user) return null
        return <StoryAvatar key={story.id} story={story} user={user} />
      })}
    </section>
  )
}
