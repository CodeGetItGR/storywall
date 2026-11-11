'use client';

import { ChevronDown, Eye, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

// The section tools step: each tool's button with its name, as the section shows them.
export function EditorTourToolRows() {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <ul className="mt-3 border-t border-[#eceef1]">
            <ToolRow icon={<Eye aria-hidden="true" />} label={t('hide')} />
            <ToolRow icon={<GripVertical aria-hidden="true" />} label={t('drag')} />
            <ToolRow icon={<ChevronDown aria-hidden="true" />} label={t('options')} />
        </ul>
    );
}

function ToolRow({ icon, label }: { icon: ReactNode; label: string }) {
    return (
        <li className="flex items-center gap-3 border-b border-[#eceef1] py-2.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e3e6ea] bg-white text-[#2f3136] shadow-[0_4px_12px_rgba(0,0,0,0.08)] [&_svg]:h-5 [&_svg]:w-5">
                {icon}
            </span>
            <span className="text-[13px] font-semibold text-[#2f3136]">{label}</span>
        </li>
    );
}
