import { InvitationElements } from '@/components/saveMyDate/invitation/InvitationElements';
import { AddToCalendar } from '@/components/saveMyDate/invitation/sections/date/AddToCalendar';
import { DateVisual } from '@/components/saveMyDate/invitation/sections/date/DateVisual';
import type { RenderContext, TextContrast } from '@/lib/invitation/render';
import type { InvitationSection } from '@/lib/invitation/sections';

type DateSectionProps = {
    section: Extract<InvitationSection, { type: 'date' }>;
    contrast: TextContrast;
    ctx: RenderContext;
};

export function DateSection({ section, contrast, ctx }: DateSectionProps) {
    return (
        <div className="section-inner">
            {/* Top space */}
            <div className="date-top-space" />
            {/* Date */}
            <DateVisual section={section} contrast={contrast} ctx={ctx} />
            {/* Calendar */}
            <AddToCalendar iso={section.data.iso} labels={ctx.labels} />
            {/* Elements */}
            <InvitationElements elements={section.elements} contrast={contrast} ctx={ctx} />
        </div>
    );
}
