'use client';

import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';

export function PlansRailSearch({ value, onChangeAction }: { value: string; onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void }) {
    const t = useTranslations('AdminPage.plans');

    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={value} onChange={onChangeAction} placeholder={t('search.placeholder')} className={adminInputClass('w-full pl-8')} />
        </div>
    );
}
