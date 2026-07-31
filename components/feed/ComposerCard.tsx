'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ImagePlus, Send, X } from 'lucide-react'
import { useActiveMember } from '@/providers/EventProvider'
import { useCreatePost, useUploadMediaBatch } from '@/hooks'
import Avatar from '@/components/ui/avatar'

const MAX_IMAGES = 10
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024

interface ComposerCardProps {
  eventId: string
  autoExpand?: boolean
}

interface PendingImage {
  key: string
  file: File
  previewUrl: string
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  mediaId?: string
  error?: string
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ComposerCard({ eventId, autoExpand = false }: ComposerCardProps) {
  const t = useTranslations('ComposerCard')
  const activeMember = useActiveMember()
  const createPost = useCreatePost()
  const uploadBatch = useUploadMediaBatch()

  const [expanded, setExpanded] = useState(autoExpand)
  const [caption, setCaption] = useState('')
  const [images, setImages] = useState<PendingImage[]>([])
  const [sizeError, setSizeError] = useState<string | null>(null)
  const [countError, setCountError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasUnresolvedFailures = images.some(img => img.status === 'failed')
  const isBusy = createPost.isPending || uploadBatch.isPending
  const canSubmit = (caption.trim().length > 0 || images.length > 0) && !hasUnresolvedFailures && !isBusy

  function expand() {
    setExpanded(true)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  function reset() {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl))
    setCaption('')
    setImages([])
    setSizeError(null)
    setCountError(null)
    setExpanded(false)
  }

  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    if (caption.trim().length === 0 && images.length === 0) {
      setExpanded(false)
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setSizeError(null)
    setCountError(null)

    const incoming = Array.from(fileList)
    const room = MAX_IMAGES - images.length
    const accepted: File[] = []
    let oversizeName: string | null = null

    for (const file of incoming) {
      if (accepted.length >= room) break
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizeName = file.name
        continue
      }
      accepted.push(file)
    }

    if (incoming.length > room) setCountError(t('maxImagesReached'))
    if (oversizeName) setSizeError(t('fileTooLarge', { filename: oversizeName }))

    if (accepted.length > 0) {
      setImages(prev => [
        ...prev,
        ...accepted.map(file => ({
          key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending' as const,
        })),
      ])
    }
  }

  function removeImage(key: string) {
    setImages(prev => {
      const target = prev.find(img => img.key === key)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(img => img.key !== key)
    })
  }

  async function uploadPendingImages(): Promise<string[] | null> {
    const toUpload = images.filter(img => img.status === 'pending' || img.status === 'failed')
    const alreadyUploaded = images.filter(img => img.status === 'uploaded' && img.mediaId)

    if (toUpload.length === 0) {
      return alreadyUploaded.map(img => img.mediaId!)
    }

    setImages(prev =>
      prev.map(img => (toUpload.some(u => u.key === img.key) ? { ...img, status: 'uploading', error: undefined } : img)),
    )

    const result = await uploadBatch.mutateAsync({
      eventId,
      files: toUpload.map(img => img.file),
      mediaType: 'IMAGE',
      uploaderMemberId: activeMember?.id,
    })

    const failedByName = new Map(result.failed.map(f => [f.filename, f.message]))
    let allUploaded = true

    setImages(prev =>
      prev.map(img => {
        if (!toUpload.some(u => u.key === img.key)) return img
        const failure = failedByName.get(img.file.name)
        if (failure) {
          allUploaded = false
          return { ...img, status: 'failed' as const, error: failure }
        }
        const created = result.created.find(m => m.originalFilename === img.file.name)
        return created ? { ...img, status: 'uploaded' as const, mediaId: created.id } : img
      }),
    )

    if (!allUploaded) return null
    return [...alreadyUploaded.map(img => img.mediaId!), ...result.created.map(m => m.id)]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const mediaIds = await uploadPendingImages()
    if (mediaIds === null) return

    await createPost.mutateAsync({
      eventId,
      authorMemberId: activeMember?.id,
      type: mediaIds.length > 0 ? 'MEDIA' : 'TEXT',
      content: caption.trim() || undefined,
      isPinned: false,
      mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
    })

    reset()
  }

  const initials = activeMember ? initialsFromName(activeMember.displayName) : '?'

  return (
    <div className="bg-card rounded-2xl shadow-[0_2px_16px_0_rgba(36,31,26,0.07)] p-4" onBlur={handleContainerBlur}>
      {!expanded ? (
        <button type="button" onClick={expand} className="w-full flex items-center gap-3 text-left">
          <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
          <span className="flex-1 bg-surface-muted rounded-full px-4 py-2.5 text-sm text-ink-faint">
            {t('placeholder')}
          </span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <Avatar initials={initials} size="md" alt={activeMember?.displayName} />
            <textarea
              ref={textareaRef}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder={t('captionPlaceholder')}
              aria-label={t('captionAriaLabel')}
              rows={3}
              className="flex-1 bg-surface-muted rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:ring-2 focus:ring-primary/30 resize-none transition leading-relaxed"
            />
          </div>

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {images.map(img => (
                <div key={img.key} className="relative aspect-square rounded-xl overflow-hidden bg-surface-muted">
                  <Image src={img.previewUrl} alt="" fill className="object-cover" sizes="200px" />
                  <button
                    type="button"
                    onClick={() => removeImage(img.key)}
                    aria-label={t('removeImage')}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 flex items-center justify-center text-white hover:bg-ink/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {img.status === 'uploading' && (
                    <div className="absolute inset-0 bg-ink/40 flex items-center justify-center text-white text-xs">…</div>
                  )}
                  {img.status === 'failed' && (
                    <div className="absolute inset-x-0 bottom-0 bg-destructive/90 text-white text-[10px] px-1.5 py-1 flex items-center justify-between gap-1">
                      <span className="truncate">{t('uploadFailed', { filename: img.file.name })}</span>
                      <button type="button" onClick={() => uploadPendingImages()} className="underline shrink-0">
                        {t('retry')}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {(sizeError || countError) && <p className="text-xs text-destructive">{sizeError ?? countError}</p>}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= MAX_IMAGES}
              className="flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
              {t('addPhotos')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={e => {
                handleFiles(e.target.files)
                e.target.value = ''
              }}
              aria-label={t('addPhotos')}
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-full text-sm font-medium text-ink-muted hover:bg-surface-muted transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-brand text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
                {isBusy ? t('posting') : t('post')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}
