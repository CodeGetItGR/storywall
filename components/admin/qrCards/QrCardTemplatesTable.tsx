'use client';

import { useTranslations } from 'next-intl';

import { AdminSortableList } from '@/components/admin/AdminSortableList';
import { QrCardTemplateRow } from '@/components/admin/qrCards/QrCardTemplateRow';
import type { AdminQrCardTemplateDto } from '@/lib/api/types';
import type { MoveDirection } from '@/lib/sortOrder';

const templateIdOf = (template: AdminQrCardTemplateDto) => template.id;

export function QrCardTemplatesTable({
    templates,
    hasAnyTemplates,
    eventTypeLabels,
    canReorder,
    onMoveAction,
    onReorderAction,
    onEditAction,
}: {
    templates: AdminQrCardTemplateDto[];
    hasAnyTemplates: boolean;
    eventTypeLabels: Record<string, string>;
    canReorder: boolean;
    onMoveAction: (templateId: string, direction: MoveDirection) => void;
    onReorderAction: (activeId: string, overId: string) => void;
    onEditAction: (templateId: string) => void;
}) {
    const t = useTranslations('AdminPage.qrCards');

    if (templates.length === 0) {
        return <p className="px-3 py-8 text-center text-sm text-ink-muted">{hasAnyTemplates ? t('noMatches') : t('empty')}</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left">
                {/* Header */}
                <thead>
                    <tr className="border-b border-border text-[11px] font-bold tracking-wide text-ink-faint uppercase">
                        <th className="px-3 py-2">{t('columns.design')}</th>
                        <th className="px-3 py-2">{t('columns.eventTypes')}</th>
                        <th className="px-3 py-2">{t('columns.code')}</th>
                        <th className="px-3 py-2">{t('columns.status')}</th>
                        <th className="px-3 py-2">{t('columns.order')}</th>
                        <th className="px-3 py-2" />
                    </tr>
                </thead>
                {/* Rows */}
                <tbody>
                    <AdminSortableList ids={templates.map(templateIdOf)} disabled={!canReorder} onReorderAction={onReorderAction}>
                        {templates.map((template, index) => (
                            <QrCardTemplateRow
                                key={template.id}
                                template={template}
                                eventTypeLabels={eventTypeLabels}
                                isFirst={index === 0}
                                isLast={index === templates.length - 1}
                                canReorder={canReorder}
                                onMoveAction={onMoveAction}
                                onEditAction={onEditAction}
                            />
                        ))}
                    </AdminSortableList>
                </tbody>
            </table>
        </div>
    );
}
