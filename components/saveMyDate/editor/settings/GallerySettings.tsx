'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { GalleryAddPhotos } from '@/components/saveMyDate/editor/photos/gallery/GalleryAddPhotos';
import { GalleryPhotoList } from '@/components/saveMyDate/editor/photos/gallery/GalleryPhotoList';
import { SettingsChoices } from '@/components/saveMyDate/editor/settings/SettingsChoices';
import { SettingsGroup, SettingsHint } from '@/components/saveMyDate/editor/settings/SettingsControls';
import { useGallerySettings } from '@/hooks/useGallerySettings';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';

type GalleryScope = { scope: SettingsScope<SectionOf<'gallery'>> };

type GallerySettingsProps = GalleryScope & {
    // Another place to bring photos from, next to the upload button.
    extraSource?: ReactNode;
};

// The gallery (old gallery panel): how its photos are laid out, and the photos themselves.
export function GallerySettings({ scope, extraSource }: GallerySettingsProps) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    const settings = useGallerySettings(scope);
    const { gallery } = settings;

    return (
        <SettingsGroup title={t('title')}>
            <GalleryLayoutFields settings={settings} />

            {/* Photos */}
            {gallery.isAvailable && (
                <>
                    <SettingsHint>{t('count', { count: gallery.count })}</SettingsHint>
                    <GalleryPhotoList photos={settings.photos} gallery={gallery} />
                    <GalleryAddPhotos gallery={gallery} extraSource={extraSource} />
                </>
            )}
        </SettingsGroup>
    );
}

// How the photos are laid out, on its own.
export function GalleryLayoutSettings({ scope }: GalleryScope) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    const settings = useGallerySettings(scope);

    return (
        <SettingsGroup title={t('title')}>
            <GalleryLayoutFields settings={settings} />
        </SettingsGroup>
    );
}

function GalleryLayoutFields({ settings }: { settings: ReturnType<typeof useGallerySettings> }) {
    const t = useTranslations('InvitationEditor.photos.gallery');

    return (
        <>
            {/* Layout */}
            <SettingsChoices label={t('layout')} choices={settings.layouts} value={settings.layout} onChange={settings.onLayout} />

            {/* Shape */}
            {settings.hasShape && <SettingsChoices label={t('shape')} choices={settings.shapes} value={settings.shape} onChange={settings.onShape} />}
        </>
    );
}
