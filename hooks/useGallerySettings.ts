'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { useGalleryEditor } from '@/hooks/useGalleryEditor';
import type { SectionOf, SettingsScope } from '@/hooks/useSectionSettingsPanel';
import type { GalleryLayout, GalleryShape } from '@/lib/invitation/gallery';
import { galleryHasShape, setGalleryLayout, setGalleryShape } from '@/lib/invitation/galleryEdits';
import { resolveImage } from '@/lib/invitation/render';
import type { DocumentRecipe } from '@/lib/invitation/sectionSettings';

const LAYOUTS: readonly GalleryLayout[] = ['grid', 'masonry', 'carousel', 'featured'];
const SHAPES: readonly GalleryShape[] = ['round', 'square', 'rectangle', 'roundedSquare'];

// The gallery's settings: its layout, the shape of its photos, and the photos themselves.
export function useGallerySettings({ section, edit, theme, media }: SettingsScope<SectionOf<'gallery'>>) {
    const t = useTranslations('InvitationEditor.photos.gallery');
    const { data } = section;
    const editOnce = useCallback((recipe: DocumentRecipe) => edit(recipe), [edit]);
    const gallery = useGalleryEditor({ sectionId: section.id, images: data.images, edit: editOnce });

    const layouts = useMemo(() => LAYOUTS.map((value) => ({ value, label: t(`layouts.${value}`) })), [t]);
    const shapes = useMemo(() => SHAPES.map((value) => ({ value, label: t(`shapes.${value}`) })), [t]);

    const photos = useMemo(
        () =>
            data.images.map((image, index) => ({
                id: gallery.ids[index],
                src: resolveImage(image, { theme, media }),
                alt: t('photoAlt', { n: index + 1 }),
            })),
        [data.images, gallery.ids, media, t, theme],
    );

    const onLayout = useCallback((layout: GalleryLayout) => edit(setGalleryLayout(section.id, layout)), [edit, section.id]);
    const onShape = useCallback((shape: GalleryShape) => edit(setGalleryShape(section.id, shape)), [edit, section.id]);

    return {
        layout: data.layout,
        layouts,
        onLayout,
        shape: data.shape,
        shapes,
        onShape,
        hasShape: galleryHasShape(data.layout),
        photos,
        gallery,
    };
}
