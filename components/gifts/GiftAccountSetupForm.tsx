'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { GiftAccountForm } from '@/components/gifts/GiftAccountForm';

interface GiftAccountSetupFormProps {
    onSubmitAction: (event: React.SubmitEvent<HTMLFormElement>) => void;
    isSaving: boolean;
    invalidIban: boolean;
}

export function GiftAccountSetupForm({ onSubmitAction, isSaving, invalidIban }: GiftAccountSetupFormProps) {
    const t = useTranslations('GiftsPage');

    return (
        <div className="pt-4 pb-8">
            {/* Intro */}
            <section className="flex flex-col items-center px-2 text-center">
                <Image src="/icons/present.svg" alt="" width={80} height={80} preload className="h-20 w-20" unoptimized />
                <h2 className="mt-3 text-lg font-semibold text-ink">{t('emptyTitle')}</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">{t('emptyHost')}</p>
            </section>

            {/* Form */}
            <GiftAccountForm onSubmitAction={onSubmitAction} isSaving={isSaving} invalidIban={invalidIban} className="mt-6" />
        </div>
    );
}
