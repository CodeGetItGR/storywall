'use client';

import { useTranslations } from 'next-intl';

import { CanvasHandle } from '@/components/saveMyDate/editor/handles/CanvasHandle';
import type { CanvasHandlesValue } from '@/components/saveMyDate/editor/handles/CanvasHandlesContext';
import { useSectionHeightHandle } from '@/hooks/useSectionHeightHandle';
import { SECTION_HEIGHT_FLOOR, SECTION_HEIGHT_MAX } from '@/lib/invitation/canvasHandles';
import type { InvitationSection } from '@/lib/invitation/sections';
import { cn } from '@/lib/utils';

type SectionHeightHandleProps = {
    section: Pick<InvitationSection, 'id' | 'type' | 'style'>;
    edit: CanvasHandlesValue['edit'];
};

// The grey bar on a section's bottom edge. The footer's sits inside it, on the left.
export function SectionHeightHandle({ section, edit }: SectionHeightHandleProps) {
    const t = useTranslations('InvitationEditor.handles');
    const handle = useSectionHeightHandle(section, edit);
    const isFooter = section.type === 'footer';

    return (
        <CanvasHandle
            variant="bar"
            label={t('sectionHeight')}
            value={handle.height}
            min={SECTION_HEIGHT_FLOOR}
            max={SECTION_HEIGHT_MAX}
            valueText={t('pixels', { value: handle.height })}
            isDragging={handle.isDragging}
            handlers={handle.handlers}
            handleRef={handle.handleRef}
            className={cn('absolute', isFooter ? 'bottom-0 left-2' : 'right-2 bottom-0 translate-y-1/2')}
        />
    );
}
