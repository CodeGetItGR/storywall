'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { X, ChevronLeft, ChevronRight, Heart, Send } from 'lucide-react'
import { stories, users } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export default function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [replyText, setReplyText] = useState('')

  const storyIndex = stories.findIndex(s => s.id === id)
  const story = stories[storyIndex]

  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          // Auto-advance
          if (storyIndex < stories.length - 1) {
            router.replace(`/story/${stories[storyIndex + 1].id}`)
          } else {
            router.replace('/feed')
          }
          return 100
        }
        return p + 2
      })
    }, 100)
    return () => clearInterval(interval)
  }, [id, storyIndex, router])

  if (!story) {
    router.replace('/feed')
    return null
  }

  const user = users.find(u => u.id === story.userId)
  const timeStr = new Date(story.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  function goNext() {
    if (storyIndex < stories.length - 1) router.replace(`/story/${stories[storyIndex + 1].id}`)
    else router.replace('/feed')
  }

  function goPrev() {
    if (storyIndex > 0) router.replace(`/story/${stories[storyIndex - 1].id}`)
  }

  function handleReply(e: React.FormEvent) {
    e.preventDefault()
    setReplyText('')
  }

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col items-center justify-center">
      {/* Story container */}
      <div className="relative w-full max-w-sm h-full max-h-[100dvh] bg-black overflow-hidden">

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{
                  width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4 pt-2">
          {user && (
            <Link href="/profile" className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-white text-xs border-2 border-white/60 flex-shrink-0"
                style={{ backgroundColor: user.avatarColor }}
              >
                {user.initials}
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-white/60 text-xs leading-tight">{timeStr}</p>
              </div>
            </Link>
          )}
          <button
            onClick={() => router.back()}
            aria-label="Close story"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image */}
        <Image
          src={story.image}
          alt={user ? `${user.name}'s story` : 'Story'}
          fill
          className="object-cover"
          sizes="400px"
          priority
        />

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          aria-label="Previous story"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          aria-label="Next story"
        />

        {/* Nav arrows — desktop hint */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goPrev} aria-label="Previous" className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex">
          <button onClick={goNext} aria-label="Next" className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Reply bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-12 bg-gradient-to-t from-black/70 to-transparent">
          <form onSubmit={handleReply} className="flex items-center gap-2">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Reply to story..."
              className="flex-1 bg-white/20 backdrop-blur-sm text-white text-sm placeholder:text-white/60 rounded-full px-4 py-2.5 outline-none focus:bg-white/30 transition-colors border border-white/20"
            />
            <button
              type="button"
              aria-label="React with heart"
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <Heart className="w-5 h-5" />
            </button>
            {replyText && (
              <button
                type="submit"
                aria-label="Send reply"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
