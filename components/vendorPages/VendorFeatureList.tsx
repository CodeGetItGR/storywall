import type { LucideIcon } from 'lucide-react';

import { GradientIcon } from '@/components/vendorPages/GradientIcon';
import { FEATURE_BODY, FEATURE_TITLE } from '@/components/vendorPages/vendorPageStyles';
import { cn } from '@/lib/utils';

export type VendorFeature = { key: string; icon: LucideIcon; title: string; body: string };

// Four in a row; five wrap as three and two.
const DESKTOP_COLUMNS: Record<number, string> = { 3: 'min-[1000px]:grid-cols-3', 4: 'min-[1000px]:grid-cols-4', 5: 'min-[1000px]:grid-cols-3' };

type VendorFeatureListProps = { features: VendorFeature[]; className?: string; bodyClassName?: string };

// A row of features with an icon, a title and a sentence each. Two columns on phones, up to four on desktop.
export function VendorFeatureList({ features, className, bodyClassName = 'text-[#151313]/75' }: VendorFeatureListProps) {
    return (
        <ul className={cn('m-0 grid list-none grid-cols-1 gap-x-8 gap-y-9 p-0 min-[480px]:grid-cols-2', DESKTOP_COLUMNS[features.length], className)}>
            {features.map(({ key, icon, title, body }) => (
                <li key={key} className="min-w-0">
                    <GradientIcon icon={icon} />
                    <h3 className={FEATURE_TITLE}>{title}</h3>
                    <p className={cn(FEATURE_BODY, bodyClassName)}>{body}</p>
                </li>
            ))}
        </ul>
    );
}
