import { InvitationText } from '@/components/saveMyDate/invitation/InvitationText';
import { dateFieldIsUpper, upperWithoutAccents } from '@/lib/invitation/dateDisplay';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { dateTextCss } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';
import { readTextField } from '@/lib/invitation/textEditing';

type DateTextProps = {
    section: InvitationSection;
    path: string;
    // What the date shows: the stored text, or the date's own when that is empty.
    value: string;
    className: string;
    tag?: 'div' | 'span';
    contrast: TextContrast;
    ctx: RenderContext;
};

// One part of the date (old wedartDateTextBlock). Labels show in capitals without accents.
// Typing changes the stored text only, so a part can be emptied and shows the date's own again.
export function DateText({ section, path, value, className, tag = 'div', contrast, ctx }: DateTextProps) {
    return (
        <InvitationText
            render={ctx.renderText}
            target={{ sectionId: section.id, kind: 'field', path }}
            value={readTextField(section, path) ?? ''}
            display={dateFieldIsUpper(className) ? upperWithoutAccents(value) : value}
            tag={tag}
            className={`text-block ${className}`}
            style={dateTextCss(section, path, className, contrast, ctx)}
        />
    );
}
