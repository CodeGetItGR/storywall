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

    return (
        <SettingsGroup title={t('title')}>
            <GalleryLayoutFields settings={settings} />

            {/* Photos */}
            <GalleryPhotoFields settings={settings} extraSource={extraSource} />
        </SettingsGroup>
    );
}

// The photos themselves, on their own, and why one isn't there.
export function GalleryPhotosSettings({ scope }: GalleryScope) {
    const t = useTranslations('InvitationEditor.photos');
    const settings = useGallerySettings(scope);
    const { problem } = settings.gallery;

    return (
        <SettingsGroup title={t('gallery.title')}>
            <GalleryPhotoFields settings={settings} />
            {problem && <SettingsHint tone="error">{t(`errors.${problem}`)}</SettingsHint>}
        </SettingsGroup>
    );
}

// How the photos are laid out, on its own.
export function GalleryLayoutSettings({ scope }: GalleryScope) {
    const settings = useGallerySettings(scope);

    return (
        <SettingsGroup>
            <GalleryLayoutFields settings={settings} />
        </SettingsGroup>
    );
}

type GalleryFieldsProps = { settings: ReturnType<typeof useGallerySettings>; extraSource?: ReactNode };

function GalleryPhotoFields({ settings: { gallery, photos }, extraSource }: GalleryFieldsProps) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    if (!gallery.isAvailable) return null;

    return (
        <>
            <SettingsHint>{t('count', { count: gallery.count })}</SettingsHint>
            <GalleryPhotoList photos={photos} gallery={gallery} />
            <GalleryAddPhotos gallery={gallery} extraSource={extraSource} />
        </>
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
