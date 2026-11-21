import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FeedActionIcon } from '@/components/feed/quickActions/FeedActionIcon';
import { cn } from '@/lib/utils';

type InvitationFoldRowProps = { open: boolean; onToggle: () => void; controls: string };

// The one row a returning member sees in place of the invitation blocks. Tapping it opens them in place.
export function InvitationFoldRow({ open, onToggle, controls }: InvitationFoldRowProps) {
    const t = useTranslations('FeedLayout');

    return (
        <div className="px-4 pt-4">
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={open}
                aria-controls={controls}
                className="flex w-full items-center gap-3 rounded-2xl bg-background px-3 py-2.5 text-left text-sm font-semibold text-ink shadow-[0_4px_14px_rgba(36,31,26,0.08)]"
            >
                {/* Icon: the same sign as the feed's Invitation quick action, decoration only */}
                <FeedActionIcon action="invitation" />
                <span className="flex-1">{t('invitation')}</span>
                <ChevronDown aria-hidden className={cn('h-5 w-5 text-ink-muted transition-transform', open && 'rotate-180')} />
            </button>
        </div>
    );
}
