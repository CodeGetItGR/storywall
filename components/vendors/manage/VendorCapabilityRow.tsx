import { VENDOR_TYPE_ICONS } from '@/components/vendors/manage/vendorTypeIcons';
import type { VendorCapabilityItem } from '@/hooks/useVendorCapabilities';
import { cn } from '@/lib/utils';

const MARKER = {
    // "What vendors can do": a soft coral circle.
    soft: 'bg-primary/10 text-primary-dark',
    // Under the empty-state picture: a white circle with a thin coral ring.
    outline: 'border border-primary/30 bg-white text-primary',
};

// One vendor type: its icon, name and what it can do.
export function VendorCapabilityRow({ item, marker }: { item: VendorCapabilityItem; marker: keyof typeof MARKER }) {
    const Icon = VENDOR_TYPE_ICONS[item.type];

    return (
        <li className="flex items-start gap-3">
            {/* Icon */}
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', MARKER[marker])}>
                <Icon className="size-[18px]" aria-hidden="true" />
            </span>

            {/* Type and line */}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-px">
                <span className="text-sm font-semibold text-ink">{item.title}</span>
                <span className="text-[13px] leading-snug text-ink-muted">{item.body}</span>
            </span>
        </li>
    );
}
