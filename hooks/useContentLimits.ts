import { useMemo } from 'react';

import { useAppConfig } from '@/hooks/useAppConfig';
import type { AppContentLimitsDto } from '@/lib/api/types';
import { DEFAULT_CONTENT_LIMITS } from '@/lib/appConfigDefaults';

// Text field bounds from GET /api/config, with fallbacks until it loads.
export function useContentLimits(): AppContentLimitsDto {
    const { data } = useAppConfig();
    const limits = data?.contentLimits;
    return useMemo(() => ({ ...DEFAULT_CONTENT_LIMITS, ...limits }), [limits]);
}
