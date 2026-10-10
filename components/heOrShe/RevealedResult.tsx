'use client';

import { useTranslations } from 'next-intl';

import type { HeOrSheValue } from '@/lib/api/types';
import { cn } from '@/lib/utils';

export function RevealedResult({ result }: { result: HeOrSheValue }) {
    const t = useTranslations('HeOrShePage');
    return (
        <p
            className={cn(
                'rounded-2xl py-8 text-center text-2xl font-bold',
                result === 'HE' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700',
            )}
        >
            {result === 'HE' ? t('resultHe') : t('resultShe')}
        </p>
    );
}
