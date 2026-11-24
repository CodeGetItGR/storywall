'use client';

import { Eye } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

import type { NewSectionType } from '@/lib/invitation/newSection';

type FeedAddSectionRowProps = { type: NewSectionType; name: string; onAdd: (type: NewSectionType) => void; onPreview: (type: NewSectionType) => void };

// One section in the Add section list (spec item 11): its icon and name add it; the eye at the far right previews it.
export function FeedAddSectionRow({ type, name, onAdd, onPreview }: FeedAddSectionRowProps) {
    const t = useTranslations('InvitationEditor');
    const add = useCallback(() => onAdd(type), [onAdd, type]);
    const preview = useCallback(() => onPreview(type), [onPreview, type]);

    return (
        <li className="flex items-center gap-1">
            {/* Add: the button's label is the name, so the icon's alt isn't read twice */}
            <button
                type="button"
                onClick={add}
                aria-label={name}
                className="flex min-h-12 flex-1 items-center gap-3 rounded-xl px-2 text-left text-[15px] text-ink hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Image src={`/icons/sections/${type}.svg`} alt={name} width={26} height={26} className="h-6.5 w-6.5 shrink-0" unoptimized />
                <span aria-hidden="true">{name}</span>
            </button>

            {/* Preview */}
            <button
                type="button"
                onClick={preview}
                aria-label={`${t('preview')}: ${name}`}
                title={t('preview')}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
                <Eye className="h-5 w-5" aria-hidden="true" />
            </button>
        </li>
    );
}
