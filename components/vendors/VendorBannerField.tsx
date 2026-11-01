'use client';

import { ImagePlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { VendorBanner } from '@/components/vendors/VendorBanner';
import { VENDOR_IMAGE_ACCEPT } from '@/components/vendors/VendorLogoField';
import { useVendorImagePicker } from '@/hooks/useVendorImagePicker';

// The banner picker: a wide preview the shape guests see, with choose and remove actions.
export function VendorBannerField({
    file,
    currentBannerUrl,
    removeBanner,
    name,
    disabled,
    setBanner,
    setRemoveBanner,
}: {
    file: File | null;
    currentBannerUrl: string | null;
    removeBanner: boolean;
    name: string;
    disabled: boolean;
    setBanner: (file: File | null) => void;
    setRemoveBanner: (remove: boolean) => void;
}) {
    const t = useTranslations('Vendors');
    const { inputRef, previewUrl, openPicker, handleChange, handleRemove } = useVendorImagePicker({
        file,
        currentUrl: currentBannerUrl,
        remove: removeBanner,
        setFile: setBanner,
        setRemove: setRemoveBanner,
    });

    return (
        <div className="flex flex-col gap-1.5">
            {/* Label */}
            <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('profile.banner')}</span>

            {/* Preview */}
            <VendorBanner
                bannerUrl={previewUrl}
                alt={t('bannerAlt', { name: name || t('me.profileMissing') })}
                sizes="(min-width: 640px) 400px, 90vw"
                className="aspect-[3/1] w-full rounded-2xl"
            />

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={openPicker} disabled={disabled} className="gap-2 rounded-full px-3">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {t('profile.bannerChoose')}
                </Button>
                {previewUrl && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemove}
                        disabled={disabled}
                        aria-label={t('profile.bannerRemove')}
                        title={t('profile.bannerRemove')}
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}
                <input ref={inputRef} type="file" accept={VENDOR_IMAGE_ACCEPT} onChange={handleChange} className="hidden" />
            </div>
        </div>
    );
}
