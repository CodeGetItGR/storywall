import { AlertTriangle, Clock3, XCircle } from 'lucide-react';

import type { EventStatus } from '@/lib/api/types';

export function EventLifecycleIcon({ status }: { status: Exclude<EventStatus, 'ACTIVE'> }) {
    if (status === 'DRAFT') return <Clock3 className="h-4 w-4" aria-hidden="true" />;
    if (status === 'FROZEN') return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
    return <XCircle className="h-4 w-4" aria-hidden="true" />;
}
