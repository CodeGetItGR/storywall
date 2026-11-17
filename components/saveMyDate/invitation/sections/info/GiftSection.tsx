import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { GiftCopyButton, GiftIbanBox } from '@/components/saveMyDate/invitation/sections/info/GiftIban';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type GiftSectionProps = {
    section: Extract<InvitationSection, { type: 'gift' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The bank details for gifts.
export function GiftSection({ section, contrast, ctx }: GiftSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Title */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            {/* Card */}
            <div className="gift-card">
                <SectionText section={section} path="bank" value={data.bank} tag="h3" contrast={contrast} ctx={ctx} />
                <GiftIbanBox>
                    <SectionText section={section} path="iban" value={data.iban} contrast={contrast} ctx={ctx} />
                </GiftIbanBox>
                <GiftCopyButton iban={data.iban} copyLabel={ctx.labels.copy} copiedLabel={ctx.labels.copied} />
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
