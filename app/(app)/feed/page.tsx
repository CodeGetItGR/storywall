'use client'

import { useState } from 'react'
import StoriesRow from '@/components/feed/stories-row'
import PostCard from '@/components/feed/post-card'
import { posts as initialPosts } from '@/lib/mock-data'

export default function FeedPage() {
  const [posts, setPosts] = useState(initialPosts)

  return (
    <div className="flex flex-col">
      {/* Stories row — sticky */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur-sm border-b border-border">
        <StoriesRow />
      </div>

      {/* Feed heading */}
      <div className="px-4 pt-5 pb-3">
        <h1 className="text-2xl font-bold text-ink">Wall</h1>
        <p className="text-sm text-ink-muted mt-0.5">Celebrate Emma &amp; James — Oct 18, 2025</p>
      </div>

      {/* Posts */}
      <div className="flex flex-col gap-4 px-4 pb-24 lg:pb-10">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
