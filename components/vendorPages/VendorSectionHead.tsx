import { H2 } from '@/components/forBusiness/forBusinessStyles';
import { EYEBROW, GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import { cn } from '@/lib/utils';

type VendorSectionHeadProps = { eyebrow: string; plain: string; grad: string; centered?: boolean; className?: string };

export function VendorSectionHead({ eyebrow, plain, grad, centered = false, className }: VendorSectionHeadProps) {
    return (
        <div className={cn('mb-10 min-[761px]:mb-14', centered && 'text-center', className)}>
            <p className={EYEBROW}>{eyebrow}</p>
            <h2 className={cn(H2, 'max-w-[18ch]', centered && 'mx-auto')}>
                {plain} <span className={GRADIENT_TEXT}>{grad}</span>
            </h2>
        </div>
    );
}
