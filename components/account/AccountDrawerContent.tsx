'use client';

import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { AccountIdentity } from '@/components/account/AccountIdentity';
import { AccountLogoutButton } from '@/components/account/AccountLogoutButton';
import { CompactEventList } from '@/components/account/CompactEventList';
import { LanguagePreference } from '@/components/account/LanguagePreference';
import { Modal } from '@/components/ui/modal';
import { useMyEventList } from '@/hooks/useMyEventList';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

export function AccountDrawerContent({ onCloseAction }: { onCloseAction: () => void }) {
    const tEvents = useTranslations('EventsPage');
    const { displayName, email, eventQueries, isLoading, memberships } = useMyEventList();
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
                    {tEvents('createEventCta')}
                </Link>

                <div className="mt-6">
                    <LanguagePreference />
                </div>

                <section className="mt-7" aria-labelledby="account-events-heading">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                        <h2 id="account-events-heading" className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                            {tEvents('yourEvents')}
                        </h2>
                        {memberships.length > 0 && (
                            <Link
                                href={routes.events.list}
                                onClick={onCloseAction}
                                className="flex items-center gap-0.5 text-xs font-semibold text-ink-muted hover:text-ink"
                            >
                                {tEvents('allEvents')}
                                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                            </Link>
                        )}
                    </div>
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
