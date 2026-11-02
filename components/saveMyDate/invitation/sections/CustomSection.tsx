import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { customSectionLayout, type RenderContext, type TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type CustomSectionProps = {
    section: Extract<InvitationSection, { type: 'blank' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

// A section the host fills with their own texts, images and links.
export function CustomSection({ section, contrast, ctx }: CustomSectionProps) {
    const layout = customSectionLayout(section.elements);

    if (!layout.columns) {
        return (
            <div className="section-inner wedart-custom-section-inner">
                <InvitationElements elements={layout.items} contrast={contrast} ctx={ctx} />
            </div>
        );
    }

    return (
        <div className="section-inner wedart-custom-section-inner has-columns">
            {/* Header */}
            {layout.fullWidth.length > 0 && (
                <div className="wedart-custom-fullwidth">
                    <InvitationElements elements={layout.fullWidth} contrast={contrast} ctx={ctx} />
                </div>
            )}
            {/* Columns */}
            <div className="wedart-custom-columns">
                <div className="wedart-custom-column is-left">
                    <InvitationElements elements={layout.left} contrast={contrast} ctx={ctx} />
                </div>
                <div className="wedart-custom-column is-right">
                    <InvitationElements elements={layout.right} contrast={contrast} ctx={ctx} />
                </div>
            </div>
        </div>
    );
}
