'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

type SectionAddButtonProps = {
    onClick: () => void;
};

// The "+" on the line between two sections: opens the list of sections to add there.
export function SectionAddButton({ onClick }: SectionAddButtonProps) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <button
            type="button"
            aria-label={t('add')}
            title={t('add')}
            onClick={onClick}
            className="absolute bottom-0 left-1/2 z-40 grid h-10 w-10 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border-[1.5px] border-[#e0e0e0] bg-white text-[#6f9c8d] opacity-75 shadow-[0_3px_10px_rgba(0,0,0,0.14)] transition-[opacity,transform,color] hover:scale-110 hover:text-[#3f7d6a] hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-(--smd-editor-accent) focus-visible:outline-none"
        >
            <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        </button>
    );
}
