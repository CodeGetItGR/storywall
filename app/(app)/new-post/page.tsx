'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ImagePlus, X, Hash, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CURRENT_USER_ID, getUser } from '@/lib/mock-data'
import Avatar from '@/components/ui/avatar'

const MAX_CHARS = 280

export default function NewPostPage() {
  const t = useTranslations('NewPostPage')
  const router = useRouter()
  const user = getUser(CURRENT_USER_ID)

  const [caption, setCaption] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const remaining = MAX_CHARS - caption.length
  const isOver = remaining < 0

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  function addTag() {
    const clean = tagInput.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags(prev => [...prev, clean])
    }
    setTagInput('')
  }

  function handleTagKey(e: React.KeyboardEvent) {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push('/feed')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.back()}
          aria-label={t('goBack')}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-muted text-ink-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-ink">{t('title')}</h1>
        <div className="w-9" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* User row */}
        <div className="flex items-center gap-3">
          <Avatar initials={user.initials} color={user.avatarColor} size="md" alt={user.name} />
          <div>
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="text-xs text-ink-muted capitalize">{user.role}</p>
          </div>
        </div>

        {/* Caption */}
        <div className="relative">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder={t('captionPlaceholder')}
            rows={4}
            className="w-full bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
            aria-label={t('captionAriaLabel')}
          />
          <span
            className={cn(
              'absolute bottom-3 right-4 text-xs tabular-nums',
              isOver ? 'text-destructive font-semibold' : remaining < 40 ? 'text-amber-500' : 'text-ink-faint',
            )}
          >
            {remaining}
          </span>
        </div>

        {/* Image upload */}
        <div>
          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-surface-muted">
              <Image src={previewUrl} alt={t('postPreviewAlt')} fill className="object-cover" sizes="600px" />
              <button
                type="button"
                onClick={() => setPreviewUrl(null)}
                aria-label={t('removeImage')}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-2xl py-10 text-ink-faint hover:border-primary/40 hover:text-primary/60 hover:bg-primary-light/30 transition-colors"
            >
              <ImagePlus className="w-7 h-7" />
              <span className="text-sm font-medium">{t('addPhoto')}</span>
              <span className="text-xs">{t('photoFormats')}</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFile}
            aria-label={t('uploadImage')}
          />
        </div>

        {/* Tags */}
        <div>
          <div className="flex items-center gap-2 bg-surface-muted rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/30 transition">
            <Hash className="w-4 h-4 text-ink-muted flex-shrink-0" />
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
              onBlur={addTag}
              placeholder={t('addTagPlaceholder')}
              className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint outline-none"
              aria-label={t('addTag')}
              maxLength={24}
            />
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary-light text-primary-dark text-xs font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags(t => t.filter(x => x !== tag))}
                    aria-label={t('removeTag', { tag })}
                    className="ml-0.5 hover:text-primary transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!caption.trim() || isOver}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
          {t('submit')}
        </button>
      </form>
    </div>
  )
}
