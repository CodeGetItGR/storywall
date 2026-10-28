'use client';

import { QrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QrCardDesigner } from '@/components/qrCard/QrCardDesigner';
import { QrCardDesignerSkeleton } from '@/components/qrCard/QrCardSkeletons';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { useQrCardScreen } from '@/hooks/useQrCardScreen';

export function QrCardScreen() {
    const t = useTranslations('QrCardPage');
    const screen = useQrCardScreen();

    if (screen.unavailable) return null;

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={QrCode} backLabel={t('back')} backHref={screen.backHref}>
            {screen.status === 'loading' ? (
                <QrCardDesignerSkeleton />
            ) : screen.status === 'missing' ? (
                // Missing
                <p className="text-center text-sm text-ink-muted">{t('missing')}</p>
            ) : (
                <QrCardDesigner
                    designer={screen.designer}
                    exporter={screen.exporter}
                    url={screen.qrUrl}
                    lines={screen.lines}
                    label={screen.label}
                    templatesFailed={screen.templatesFailed}
                    onRetryTemplatesAction={screen.retryTemplates}
                />
            )}
        </ModulePageShell>
    );
}
