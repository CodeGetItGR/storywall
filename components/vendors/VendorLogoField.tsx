'use client';

import { ImagePlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { VendorLogo } from '@/components/vendors/VendorLogo';
import { useVendorImagePicker } from '@/hooks/useVendorImagePicker';

export const VENDOR_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

// A hidden file input opened by a button, with a preview and a remove action.
export function VendorLogoField({
    file,
    currentLogoUrl,
    removeLogo,
    name,
    disabled,
    setLogo,
    setRemoveLogo,
}: {
    file: File | null;
    currentLogoUrl: string | null;
    removeLogo: boolean;
    name: string;
    disabled: boolean;
    setLogo: (file: File | null) => void;
    setRemoveLogo: (remove: boolean) => void;
}) {
    const t = useTranslations('Vendors.profile');
    const { inputRef, previewUrl, openPicker, handleChange, handleRemove } = useVendorImagePicker({
        file,
        currentUrl: currentLogoUrl,
        remove: removeLogo,
        setFile: setLogo,
        setRemove: setRemoveLogo,
    });

    return (
        <div className="flex flex-col gap-1.5">
            {/* Label */}
            <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('logo')}</span>

            <div className="flex items-center gap-3">
                {/* Preview */}
                <VendorLogo logoUrl={previewUrl} name={name} className="size-12" />

                {/* Actions */}
                <Button type="button" variant="outline" onClick={openPicker} disabled={disabled} className="gap-2 rounded-full px-3">
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {t('logoChoose')}
                </Button>
                {previewUrl && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleRemove}
                        disabled={disabled}
                        aria-label={t('logoRemove')}
                        title={t('logoRemove')}
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}
                <input ref={inputRef} type="file" accept={VENDOR_IMAGE_ACCEPT} onChange={handleChange} className="hidden" />
            </div>
        </div>
    );
}
