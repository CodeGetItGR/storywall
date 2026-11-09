'use client';

import { Menu } from '@base-ui/react/menu';
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { SectionToolButton } from '@/components/saveMyDate/editor/sections/SectionToolButton';
import { cn } from '@/lib/utils';

type SectionMenuProps = {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete: () => void;
};

// A section's menu: move it one place up or down, or delete it.
export function SectionMenu({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDelete }: SectionMenuProps) {
    const t = useTranslations('InvitationEditor.sections');

    return (
        <Menu.Root modal={false}>
            <Menu.Trigger render={<SectionToolButton label={t('options')} className="data-popup-open:[&_svg]:rotate-180" />}>
                <ChevronDown className="transition-transform" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={6} collisionPadding={12} className="smd-editor z-50">
                    <Menu.Popup className="motion-popover flex min-w-44 flex-col gap-px rounded-[14px] border border-(--smd-editor-line) bg-(--smd-editor-panel) p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.18)] outline-none">
                        {/* Move */}
                        <SectionMenuItem disabled={!canMoveUp} onClick={onMoveUp} icon={<ArrowUp aria-hidden="true" />}>
                            {t('moveUp')}
                        </SectionMenuItem>
                        <SectionMenuItem disabled={!canMoveDown} onClick={onMoveDown} icon={<ArrowDown aria-hidden="true" />}>
                            {t('moveDown')}
                        </SectionMenuItem>

                        {/* Delete */}
                        <SectionMenuItem tone="danger" onClick={onDelete} icon={<Trash2 aria-hidden="true" />}>
                            {t('delete')}
                        </SectionMenuItem>
                    </Menu.Popup>
                </Menu.Positioner>
            </Menu.Portal>
        </Menu.Root>
    );
}

type SectionMenuItemProps = {
    icon: ReactNode;
    onClick: () => void;
    disabled?: boolean;
    tone?: 'default' | 'danger';
    children: ReactNode;
};

function SectionMenuItem({ icon, onClick, disabled = false, tone = 'default', children }: SectionMenuItemProps) {
    return (
        <Menu.Item
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex h-11 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm outline-none [&_svg]:h-4 [&_svg]:w-4',
                'data-highlighted:bg-white/10 data-disabled:cursor-default data-disabled:opacity-35',
                tone === 'danger' ? 'text-(--smd-editor-danger)' : 'text-(--smd-editor-text)',
            )}
        >
            {icon}
            {children}
        </Menu.Item>
    );
}
