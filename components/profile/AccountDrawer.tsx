'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { Modal } from '@/components/ui/modal';
import { useProfilePageData } from '@/hooks/useProfilePageData';
import { routes } from '@/lib/routes';
import { useEventSwitcher } from '@/providers/EventProvider';

import { AccountIdentity } from './AccountIdentity';
import { AccountLogoutButton } from './AccountLogoutButton';
import { CompactEventList } from './CompactEventList';
import { LanguagePreference } from './LanguagePreference';

interface AccountDrawerProps {
    open: boolean;
    onClose: () => void;
}

function AccountDrawerContent({ onClose }: { onClose: () => void }) {
    const t = useTranslations('ProfilePage');
    const { displayName, email, eventQueries, isLoading, memberships } = useProfilePageData();
    const { activeEvent, setActiveEventId } = useEventSwitcher();

    function handleEventSelect(eventId: string) {
        setActiveEventId(eventId);
        onClose();
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <Modal.Body className="px-4 pt-14 pb-6">
                <AccountIdentity displayName={displayName} email={email} />

                <Link
                    href={routes.events.new}
                    onClick={onClose}
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

            <div className="border-t border-border bg-background p-4">
                <AccountLogoutButton onLogout={onClose} />
            </div>
        </div>
    );
}

export function AccountDrawer({ open, onClose }: AccountDrawerProps) {
    const t = useTranslations('ProfilePage');

    return (
        <Modal open={open} onClose={onClose} variant="drawer" ariaLabel={t('drawerLabel')} closeLabel={t('closeDrawer')}>
            {open && <AccountDrawerContent onClose={onClose} />}
        </Modal>
    );
}
