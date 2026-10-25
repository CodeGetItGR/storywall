import { ImagePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { MockPhoto } from '@/components/occasions/wedding/mock/MockPhoto';
import type { OccasionPhoto } from '@/lib/occasions/occasionMedia';

type FeedComposerProps = { loading?: 'eager' | 'lazy'; placeholder: string; viewer: OccasionPhoto };

// "Share a memory…": the viewer's face, the placeholder and the photo button.
export function FeedComposer({ loading, placeholder, viewer }: FeedComposerProps) {
    const t = useTranslations('ImageAlt');

    return (
        <div className="flex items-center gap-[3cqw] px-[4cqw] pt-[5cqw] pb-[4cqw]">
            <span className="block shrink-0 rounded-full bg-[#f3e3d8] p-[0.6cqw]">
                <MockPhoto alt={t('profilePhoto')} className="block size-[11.5cqw] rounded-full" loading={loading} photo={viewer} sizes="56px" />
            </span>
            <span className="min-w-0 flex-1 truncate rounded-full bg-[#fbe9dd] px-[5cqw] py-[3.4cqw] text-[3.8cqw] leading-none text-[#151313]/40">
                {placeholder}
            </span>
            <span className="grid size-[13cqw] shrink-0 place-items-center rounded-full bg-white shadow-[0_1.5cqw_5cqw_rgba(70,38,24,0.14)]">
                <ImagePlus className="size-[5.6cqw] text-[#151313]/70" strokeWidth={1.7} />
            </span>
        </div>
    );
}
