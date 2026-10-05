'use client';

import { useTranslations } from 'next-intl';

import type { ModerationContentDto } from '@/lib/api/types';

// The reported item as it is now (guide §2.2). null: it was deleted before the review.
export function ModerationContentPreview({ content, isMemberCase = false }: { content: ModerationContentDto | null; isMemberCase?: boolean }) {
    const t = useTranslations('AdminPage.moderation');

    if (!content) return <p className="text-sm text-ink-muted">{t('contentGone')}</p>;

    return (
        <section className="space-y-3">
            {/* Author */}
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span className="min-w-0 truncate">{content.authorDisplayName ?? t('noAuthor')}</span>
                {content.authorIsHost ? (
                    <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-0.5 text-[11px] font-bold text-status-neutral">
                        {t('hostBadge')}
                    </span>
                ) : null}
            </p>

            {/* Text */}
            {content.text ? (
                <div className="space-y-1.5">
                    {isMemberCase ? (
                        <span className="inline-flex rounded-full bg-status-neutral-wash px-2.5 py-0.5 text-[11px] font-bold text-status-neutral">
                            {t('customRoleLabel')}
                        </span>
                    ) : null}
                    <p className="text-sm leading-6 break-words whitespace-pre-wrap text-ink">{content.text}</p>
                </div>
            ) : null}

            {/* Media */}
            {/* Admins are always sent a mediaUrl; the type is shared with members, who see null while a video processes. */}
            {content.media.map((m) => {
                if (m.mediaType === 'VIDEO') {
                    return (
                        <video
                            key={m.id}
                            controls
                            preload="metadata"
                            src={m.mediaUrl ?? undefined}
                            className="max-h-96 w-full rounded-lg border border-border bg-canvas"
                        />
                    );
                }
                if (m.mediaType === 'AUDIO') {
                    return <audio key={m.id} controls preload="metadata" src={m.mediaUrl ?? undefined} className="w-full" />;
                }
                if (m.mediaType === 'DOCUMENT') {
                    return (
                        <a
                            key={m.id}
                            href={m.mediaUrl ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-sm font-semibold break-all text-ink underline"
                        >
                            {m.originalFilename}
                        </a>
                    );
                }
                return (
                    <a key={m.id} href={m.mediaUrl ?? undefined} target="_blank" rel="noreferrer" className="block">
                        {/* Presigned, short-lived URL: next/image would cache it past expiry. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={m.thumbnailUrl ?? m.mediaUrl ?? undefined}
                            alt={m.originalFilename}
                            className="max-h-96 w-full rounded-lg border border-border bg-canvas object-contain"
                        />
                    </a>
                );
            })}
        </section>
    );
}
