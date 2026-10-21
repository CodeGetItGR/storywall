'use client';

import { Pencil, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { VendorProfileSheet } from '@/components/vendors/VendorProfileSheet';
import { useVendorProfile } from '@/hooks/useVendorProfile';

// Only for people who have joined an event as a vendor; edits show on every event's vendor list.
export function ProfileVendorSection() {
    const t = useTranslations('Vendors.profile');
    const tTypes = useTranslations('Vendors.types');
    const { data: profile } = useVendorProfile();
    const [editing, setEditing] = useState(false);
    const openEditor = useCallback(() => setEditing(true), []);
    const closeEditor = useCallback(() => setEditing(false), []);

    if (!profile) return null;

    return (
        <section className="rounded-[1.5rem] bg-card p-4 shadow-[0_18px_48px_rgba(35,28,22,0.08)] sm:p-5">
            {/* Vendor header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-primary" aria-hidden="true" />
                    <h2 className="text-base font-semibold text-ink">{t('sectionTitle')}</h2>
                </div>
                <Button type="button" variant="outline" onClick={openEditor} className="gap-2 rounded-full px-3">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {t('edit')}
                </Button>
            </div>

            {/* Details */}
            <div className="mt-3 flex items-center gap-3">
                <VendorLogo logoUrl={profile.logoUrl} name={profile.businessName} />
                <div className="min-w-0 text-sm">
                    <p className="truncate font-semibold text-ink">{profile.businessName}</p>
                    <p className="text-ink-muted">{tTypes(profile.vendorType)}</p>
                    {profile.link && <p className="truncate text-ink-muted">{profile.link}</p>}
                </div>
            </div>

            {/* Edit sheet */}
            {editing && <VendorProfileSheet open profile={profile} defaultType={profile.vendorType} onCloseAction={closeEditor} />}
        </section>
    );
}
