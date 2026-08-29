'use client';

import { ImagePlus, MessageSquareHeart, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function FeedEmptyState() {
    const t = useTranslations('FeedPage');

    return (
        <div className="px-4 pt-5 pb-10">
            <div className="relative isolate overflow-hidden px-6 py-10 text-center">
                {/* Icon */}
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-background shadow-[0_12px_34px_rgba(36,31,26,0.1)]" />
                    <div className="absolute -right-1 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(255,122,89,0.32)]">
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground">
                        <MessageSquareHeart className="h-8 w-8" strokeWidth={1.8} aria-hidden="true" />
                    </div>
                </div>

                {/* Message */}
                <div className="relative mt-6">
                    <h2 className="text-xl font-semibold text-ink">{t('emptyPostsTitle')}</h2>
                    <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-ink-muted">{t('emptyPostsBody')}</p>
                </div>

                {/* Preview marks */}
                <div className="relative mx-auto mt-7 flex max-w-[15rem] items-center justify-center gap-2 text-ink-faint">
                    <span className="h-px flex-1 bg-border" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background shadow-[0_8px_20px_rgba(36,31,26,0.07)]">
                        <ImagePlus className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="h-px flex-1 bg-border" />
                </div>
            </div>
        </div>
    );
}
