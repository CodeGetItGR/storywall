import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { FaqItem } from '@/components/saveMyDate/invitation/sections/faq/FaqItem';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { faqVars } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type FaqSectionProps = {
    section: Extract<InvitationSection, { type: 'faq' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function FaqSection({ section, contrast, ctx }: FaqSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Title */}
            <SectionText section={section} path="title" value={data.title} tag="h2" contrast={contrast} ctx={ctx} />
            {/* Questions */}
            <div className="faq-list" style={faqVars(data, contrast, ctx)}>
                {data.items.map((item) => (
                    <FaqItem key={item.id} question={item.question} answer={item.answer} />
                ))}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
