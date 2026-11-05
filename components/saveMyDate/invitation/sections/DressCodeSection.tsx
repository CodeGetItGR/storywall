import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { SectionText } from '@/components/saveMyDate/invitation/sections/SectionText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type DressCodeSectionProps = {
    section: Extract<InvitationSection, { type: 'dressCode' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// The dress code note and the colours guests are asked to wear.
export function DressCodeSection({ section, contrast, ctx }: DressCodeSectionProps) {
    const { data } = section;

    return (
        <div className="section-inner">
            {/* Title */}
            <div className="dress-code-head">
                <SectionText section={section} path="title" value={data.title} tag="span" className="dress-code-title" contrast={contrast} ctx={ctx} />
            </div>
            {/* Note */}
            <SectionText section={section} path="note" value={data.note} tag="p" className="dress-code-note" contrast={contrast} ctx={ctx} />
            {/* Colours */}
            <div className="dress-code-colors">
                {data.colors.map((color, index) => (
                    <div key={`${color}-${index}`} className="dress-code-swatch" style={{ background: color }} />
                ))}
            </div>
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
