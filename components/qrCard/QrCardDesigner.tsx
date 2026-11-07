'use client';

import type { ReactNode } from 'react';

import { ThemeFontFace } from '@/components/event/ThemeFontFace';
import { QrCardActions } from '@/components/qrCard/QrCardActions';
import { QrCardPerPageControl } from '@/components/qrCard/QrCardPerPageControl';
import { QrCardPrintCopies } from '@/components/qrCard/QrCardPrintCopies';
import { QrCardPrintStyle } from '@/components/qrCard/QrCardPrintStyle';
import { QrCardSizeControl } from '@/components/qrCard/QrCardSizeControl';
import { QrCardSvg } from '@/components/qrCard/QrCardSvg';
import { QrCardTemplateStrip } from '@/components/qrCard/QrCardTemplateStrip';
import { QrCardTextFields } from '@/components/qrCard/QrCardTextFields';
import type { QrCardDesignerState } from '@/hooks/useQrCardDesigner';
import type { QrCardExportState } from '@/hooks/useQrCardExport';
import type { QrCardLine } from '@/lib/qrCard';

// The card preview (also what prints), the design picker, the text fields, any extra options the
// caller passes (the gift card's PIN) and the actions.
export function QrCardDesigner({
    designer,
    exporter,
    url,
    lines,
    label,
    templatesFailed,
    onRetryTemplatesAction,
    children,
}: {
    designer: QrCardDesignerState;
    exporter: QrCardExportState;
    url: string;
    lines: QrCardLine[];
    label: string;
    templatesFailed: boolean;
    onRetryTemplatesAction: () => void;
    children?: ReactNode;
}) {
    const { svgRef } = exporter;
    const card = { style: designer.style, url, title: designer.text.title, lines, fields: designer.fieldTexts, label };

    return (
        <div className="flex flex-col gap-6">
            {/* Card */}
            <div data-print-root data-qr-card-print className="mx-auto w-full max-w-xs overflow-hidden rounded-lg shadow-sm">
                <QrCardSvg ref={svgRef} {...card} className="block h-auto w-full" />
                {exporter.sheet && <QrCardPrintCopies sheet={exporter.sheet} size={designer.size} adaptive={exporter.adaptivePrint} card={card} />}
            </div>
            <QrCardPrintStyle size={designer.size} sheet={exporter.sheet} adaptive={exporter.adaptivePrint} />
            <ThemeFontFace font={designer.style.headingFont} />

            {/* Designs */}
            <QrCardTemplateStrip
                templates={designer.templates}
                selectedId={designer.selectedId}
                failed={templatesFailed}
                onSelectAction={designer.selectTemplate}
                onRetryAction={onRetryTemplatesAction}
            />

            {/* Text */}
            <QrCardTextFields
                text={designer.text}
                showTitle={designer.showTitle}
                showGiver={designer.showGiver}
                hostFields={designer.hostFields}
                onChangeAction={designer.handleTextChange}
                onFieldChangeAction={designer.handleFieldChange}
            />

            {/* Options */}
            {children}

            {/* Size */}
            <QrCardSizeControl sizes={designer.sizes} size={designer.size} onChangeAction={designer.handleSizeChange} />

            {/* Per page */}
            <QrCardPerPageControl perPage={exporter.perPage} sheetCount={exporter.sheetCount} onChangeAction={exporter.handlePerPageChange} />

            {/* Actions */}
            <QrCardActions exporter={exporter} />
        </div>
    );
}
