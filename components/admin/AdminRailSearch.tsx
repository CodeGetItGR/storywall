'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent } from 'react';

import { adminInputClass } from '@/components/admin/AdminField';

export function AdminRailSearch({
    value,
    placeholder,
    onChangeAction,
}: {
    value: string;
    placeholder: string;
    onChangeAction: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={value} onChange={onChangeAction} placeholder={placeholder} aria-label={placeholder} className={adminInputClass('w-full pl-8')} />
        </div>
    );
}
