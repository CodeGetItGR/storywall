'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useId } from 'react';

import { AppLink } from '@/components/ui/AppLink';
import { useModuleCopy } from '@/hooks/useModuleCopy';
import type { EventTypeConvention } from '@/lib/api/types';
import type { FeedModuleKey } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

// href: where Open goes, the module's tool (feedModuleToolHref). underTools: in edit mode, with room for the block's
// tools at the top of the card.
type FeedModuleBlockProps = { module: FeedModuleKey; eventType: EventTypeConvention; href: string; available: boolean; underTools?: boolean };

const BUTTON = 'inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-[14px] font-semibold text-white';

// A module's compact block on the feed (spec item 16): its icon, its name, and a button that opens the tool. An
// event that lost the module draws it in edit mode only, with the button off (Open question 7).
export function FeedModuleBlock({ module, eventType, href, available, underTools = false }: FeedModuleBlockProps) {
    const t = useTranslations('FeedEditor');
    const name = useModuleCopy(eventType)(module).name;
    const nameId = useId();

    return (
        <div
            className={cn(
                'mx-4 my-3 flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-5 text-center font-sans shadow-[0_6px_18px_rgba(0,0,0,0.06)]',
                underTools && 'pt-18',
            )}
        >
            {/* Icon and name */}
            <Image src={`/icons/modules/${module}.svg`} alt={name} width={40} height={40} className="h-10 w-10" unoptimized />
            <p id={nameId} className="text-[15px] font-semibold text-ink">
                {name}
            </p>

            {/* Open the tool */}
            {available ? (
                <AppLink
                    href={href}
                    aria-describedby={nameId}
                    className={cn(BUTTON, 'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none')}
                >
                    {t('moduleOpen')}
                </AppLink>
            ) : (
                <button type="button" disabled aria-describedby={nameId} className={cn(BUTTON, 'opacity-50')}>
                    {t('moduleOpen')}
                </button>
            )}
        </div>
    );
}
