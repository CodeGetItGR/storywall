'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { usePost } from '@/hooks'
import { EventNotFound } from '@/components/feed'
import { ApiError } from '@/lib/api/client'

export default function PostRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('PostModal')
  const { data: post, error } = usePost(id)

  useEffect(() => {
    if (post) router.replace(`/feed/${post.eventId}?post=${post.id}`)
  }, [post, router])

  if (error instanceof ApiError && error.status === 404) {
    return <EventNotFound />
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-sm text-ink-muted">
      {t('loading')}
    </div>
  )
}
