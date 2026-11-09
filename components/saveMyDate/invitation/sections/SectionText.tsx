import { InvitationText } from '@/components/saveMyDate/invitation/InvitationText';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { type FieldTag, fieldTextCss } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type SectionTextProps = {
    section: InvitationSection;
    // The field's path, which is also where its style lives in textStyles.
    path: string;
    value: string;
    tag?: FieldTag;
    className?: string;
    contrast: TextContrast;
    ctx: RenderContext;
};

// One of a section's own text fields (the old tb()).
export function SectionText({ section, path, value, tag = 'div', className = '', contrast, ctx }: SectionTextProps) {
    return (
        <InvitationText
            target={{ sectionId: section.id, kind: 'field', path }}
            value={value}
            tag={tag}
            className={['text-block', className].filter(Boolean).join(' ')}
            style={fieldTextCss(section, path, tag, className, contrast, ctx)}
        />
    );
}
