'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export function usePostModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const postId = searchParams.get('post')

  function open(id: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('post', id)
    router.push(`${pathname}?${params.toString()}`)
  }

  function close() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('post')
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return { postId, isOpen: postId !== null, open, close }
}
