import { errorStatusTone } from '@/lib/adminBetaFeedback';
import { cn } from '@/lib/utils';

const TONE_STYLES = {
    warn: 'bg-status-warn-wash text-status-warn',
    danger: 'bg-status-danger-wash text-status-danger',
} as const;

export function ErrorStatusPill({ status }: { status: number }) {
    return (
        <span className={cn('inline-flex rounded-full px-2.5 py-1 font-mono text-[11px] font-bold', TONE_STYLES[errorStatusTone(status)])}>
            {status}
        </span>
    );
}
