'use client';

import { Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useEventRouteContext } from '@/components/routing/EventRouteGate';
import { ModuleNotice } from '@/components/tools/ModuleNotice';
import { ModulePageShell } from '@/components/tools/ModulePageShell';
import { Button } from '@/components/ui/button';
import { FormFieldLabel } from '@/components/ui/FormFieldLabel';
import { useAnnouncementComposer } from '@/hooks/useAnnouncementComposer';
import { routes } from '@/lib/routes';

export function AnnouncementScreen() {
    const t = useTranslations('Vendors.announcement');
    const { eventId } = useEventRouteContext();
    const composer = useAnnouncementComposer(eventId);

    return (
        <ModulePageShell maxWidth="xl" title={t('title')} icon={Megaphone} backLabel={t('back')} backHref={routes.events.feed(eventId)}>
            {/* Notice */}
            {composer.blockedMessage && <ModuleNotice>{composer.blockedMessage}</ModuleNotice>}

            <form onSubmit={composer.handleSubmit} noValidate className="flex flex-col gap-4">
                {/* Message */}
                <div>
                    <FormFieldLabel label={t('label')}>
                        <textarea
                            value={composer.content}
                            maxLength={composer.maxLength}
                            rows={5}
                            onChange={composer.handleContentChange}
                            className="w-full rounded-xl border border-border bg-background p-3 text-sm text-ink focus-ring"
                        />
                    </FormFieldLabel>
                    {composer.error && (
                        <p role="alert" className="mt-1 text-sm text-rose-600">
                            {composer.error}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <Button type="submit" size="lg" disabled={composer.isPosting || Boolean(composer.blockedMessage)} className="self-end">
                    {t('send')}
                </Button>
            </form>
        </ModulePageShell>
    );
}
