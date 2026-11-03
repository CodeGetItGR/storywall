import { dateFieldIsUpper, upperWithoutAccents } from '@/lib/invitation/dateDisplay';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import { dateTextCss } from '@/lib/invitation/sectionCss';
import type { InvitationSection } from '@/lib/invitation/sections';

type DateTextProps = {
    section: InvitationSection;
    path: string;
    value: string;
    className: string;
    tag?: 'div' | 'span';
    contrast: TextContrast;
    ctx: RenderContext;
};

// One part of the date (old wedartDateTextBlock). Labels show in capitals without accents.
export function DateText({ section, path, value, className, tag: Tag = 'div', contrast, ctx }: DateTextProps) {
    return (
        <Tag className={`text-block ${className}`} style={dateTextCss(section, path, className, contrast, ctx)}>
            {dateFieldIsUpper(className) ? upperWithoutAccents(value) : value}
        </Tag>
    );
}
