'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AccountIdentity } from '@/components/profile/AccountIdentity';
import { AccountLogoutButton } from '@/components/profile/AccountLogoutButton';
import { CompactEventList } from '@/components/profile/CompactEventList';
import { LanguagePreference } from '@/components/profile/LanguagePreference';
import { Modal } from '@/components/ui/modal';
import { useProfilePageData } from '@/hooks/useProfilePageData';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

export function AccountDrawerContent({ onCloseAction }: { onCloseAction: () => void }) {
    const t = useTranslations('ProfilePage');
    const { displayName, email, eventQueries, isLoading, memberships } = useProfilePageData();
    const { activeEvent, setActiveEventId } = useEventSwitcher();

    function handleEventSelect(eventId: string) {
        setActiveEventId(eventId);
        onCloseAction();
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <Modal.Body className="px-4 pt-14 pb-6">
                <section className={'flex justify-between w-full'}>
                    <AccountIdentity displayName={displayName} email={email} />
                        <AccountLogoutButton onLogoutAction={onCloseAction} />
                </section>

                <Link
                    href={routes.events.new}
                    onClick={onCloseAction}
                    className="mt-6 flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                    <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                    {t('createEventCta')}
                </Link>

                <div className="mt-6">
                    <LanguagePreference />
                </div>

                <section className="mt-7" aria-labelledby="account-events-heading">
                    <h2 id="account-events-heading" className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                        {t('yourEvents')}
                    </h2>
                    <CompactEventList
                        activeEventId={activeEvent?.id ?? null}
                        eventQueries={eventQueries}
                        isLoading={isLoading}
                        memberships={memberships}
                        onSelect={handleEventSelect}
                    />
                </section>
            </Modal.Body>
        </div>
    );
}
