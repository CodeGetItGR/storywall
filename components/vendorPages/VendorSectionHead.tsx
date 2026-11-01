import { H2 } from '@/components/forBusiness/forBusinessStyles';
import { EYEBROW, GRADIENT_TEXT } from '@/components/vendorPages/vendorPageStyles';
import { cn } from '@/lib/utils';

type VendorSectionHeadProps = { eyebrow: string; plain: string; grad: string; className?: string };

export function VendorSectionHead({ eyebrow, plain, grad, className }: VendorSectionHeadProps) {
    return (
        <div className={cn('mb-10 min-[761px]:mb-14', className)}>
            <p className={EYEBROW}>{eyebrow}</p>
            <h2 className={`${H2} max-w-[18ch]`}>
                {plain} <span className={GRADIENT_TEXT}>{grad}</span>
            </h2>
        </div>
    );
}
