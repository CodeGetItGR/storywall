import { useLocale } from 'next-intl';
import { useMemo } from 'react';

import { formatSessionLocationWhen, type SessionLocationViewModel } from '@/lib/sessionLocations';

export function useSessionLocationWhen(location: Pick<SessionLocationViewModel, 'startAt' | 'endAt'>) {
    const locale = useLocale();

    return useMemo(() => formatSessionLocationWhen(locale, location.startAt, location.endAt), [locale, location.startAt, location.endAt]);
}
