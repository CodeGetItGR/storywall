'use client';

import { Camera, FileText, Globe, type LucideIcon, Mail, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { EMPTY_VALUE } from '@/lib/adminFunnel';
import { type ReachChannelKey, reachChannels } from '@/lib/adminOutreach';
import type { OutreachProspectRowDto } from '@/lib/api/types';

const ICON: Record<ReachChannelKey, LucideIcon> = {
    email: Mail,
    phone: Phone,
    website: Globe,
    instagram: Camera,
    contactForm: FileText,
};

// The first way to reach them, in the order we would try.
export function OutreachContactCell({ row }: { row: OutreachProspectRowDto }) {
    const t = useTranslations('AdminPage.outreach.reach');
    const first = reachChannels({ ...row, website: null })[0];
    if (!first) return <span className="text-ink-faint">{EMPTY_VALUE}</span>;
    const Icon = ICON[first.key];

    return (
        <span className="flex min-w-0 items-center gap-1.5 text-ink-muted" title={t(first.key)}>
            <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">{t(first.key)}: </span>
            <span className="truncate">{first.key === 'contactForm' ? t('contactForm') : first.label}</span>
        </span>
    );
}
