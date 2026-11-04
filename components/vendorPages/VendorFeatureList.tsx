import { type VendorArt, VendorPageArt } from '@/components/vendorPages/art/VendorPageArt';
import { FEATURE_BODY, FEATURE_TITLE } from '@/components/vendorPages/vendorPageStyles';
import { cn } from '@/lib/utils';

export type VendorFeature = { key: string; art: VendorArt; title: string; body: string };

// Four in a row; five wrap as three and two.
const DESKTOP_COLUMNS: Record<number, string> = { 3: 'min-[1000px]:grid-cols-3', 4: 'min-[1000px]:grid-cols-4', 5: 'min-[1000px]:grid-cols-3' };

type VendorFeatureListProps = { features: VendorFeature[]; className?: string; bodyClassName?: string };

// A list of features with a drawing, a title and a sentence each. One column of rows on phones, up to four columns on desktop.
export function VendorFeatureList({ features, className, bodyClassName = 'text-[#151313]/75' }: VendorFeatureListProps) {
    return (
        <ul
            className={cn('m-0 grid list-none grid-cols-1 gap-x-8 gap-y-7 p-0 min-[480px]:gap-y-10 min-[480px]:grid-cols-2', DESKTOP_COLUMNS[features.length], className)}
        >
            {features.map(({ key, art, title, body }) => (
                <li key={key} className="flex min-w-0 gap-4 min-[480px]:block">
                    <VendorPageArt art={art} />
                    <div className="min-w-0">
                        <h3 className={FEATURE_TITLE}>{title}</h3>
                        <p className={cn(FEATURE_BODY, bodyClassName)}>{body}</p>
                    </div>
                </li>
            ))}
        </ul>
    );
}
