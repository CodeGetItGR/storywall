import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { cn } from '@/lib/utils';

type DetailsPreviewProps = { photoSrc: string; alt: string; title: string; titleIsPlaceholder: boolean; line: string };

// The event as guests will first see it, updating as the host types.
export function DetailsPreview({ photoSrc, alt, title, titleIsPlaceholder, line }: DetailsPreviewProps) {
    const t = useTranslations('CreateEventPage.wizard.details');

    return (
        <div className="relative h-42 shrink-0 overflow-hidden rounded-3xl shadow-[0_10px_24px_rgba(36,31,26,0.16)]">
            {/* Photo */}
            <ProtectedImage src={photoSrc} alt={alt} fill sizes="(min-width: 768px) 400px, 100vw" className="object-cover" />
            <span aria-hidden="true" className="absolute inset-0 bg-linear-to-b from-[rgba(20,14,10,0.1)] to-[rgba(20,14,10,0.78)]" />

            {/* Tag */}
            <span className="absolute top-3 left-3 rounded-xl bg-white/90 px-2.5 py-1 text-xs font-bold text-ink">{t('preview')}</span>

            {/* Title and when */}
            <div className="absolute inset-x-4.5 bottom-4 flex flex-col gap-1 text-white">
                <span className={cn('line-clamp-2 font-editorial text-[26px] leading-[1.1]', titleIsPlaceholder && 'opacity-70')}>{title}</span>
                {line && <span className="text-sm text-[#f6ece4]">{line}</span>}
            </div>
        </div>
    );
}
