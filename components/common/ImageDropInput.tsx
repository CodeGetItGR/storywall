'use client';

import { ImagePlus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { useImageDropInput } from '@/hooks/useImageDropInput';
import { cn } from '@/lib/utils';

type ImageDropInputProps = {
    name: string;
    accept: string;
    required?: boolean;
    disabled?: boolean;
};

// A single-image picker: click or drop into the area, with a preview once picked.
export function ImageDropInput({ name, accept, required, disabled }: ImageDropInputProps) {
    const t = useTranslations('ImageDropInput');
    const { inputRef, file, previewUrl, isDragActive, handleChange, handleDragOver, handleDragLeave, handleDrop, clear } = useImageDropInput();

    return (
        <div className="relative">
            <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed px-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/30',
                    file ? 'py-3' : 'flex-col justify-center py-7 text-center',
                    isDragActive ? 'border-primary bg-primary/5' : 'border-ink-faint/30 bg-surface-muted hover:border-ink-faint/50',
                    disabled && 'pointer-events-none opacity-60',
                )}
            >
                {file && previewUrl ? (
                    <>
                        {/* Preview */}
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-white">
                            <ProtectedImage src={previewUrl} alt="" fill className="object-cover" sizes="56px" unoptimized />
                        </span>
                        <span className="flex min-w-0 flex-col pr-8 text-left">
                            <span className="truncate text-sm font-medium text-ink">{file.name}</span>
                            <span className="text-xs text-ink-faint">{t('change')}</span>
                        </span>
                    </>
                ) : (
                    <>
                        {/* Empty */}
                        <span
                            className={cn(
                                'flex h-11 w-11 items-center justify-center rounded-full bg-white transition-colors',
                                isDragActive ? 'text-primary' : 'text-ink-muted',
                            )}
                        >
                            <ImagePlus className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-medium text-ink">{t('add')}</span>
                    </>
                )}
                <input
                    ref={inputRef}
                    name={name}
                    type="file"
                    accept={accept}
                    required={required}
                    disabled={disabled}
                    onChange={handleChange}
                    className="sr-only"
                />
            </label>

            {/* Remove */}
            {file && (
                <button
                    type="button"
                    onClick={clear}
                    disabled={disabled}
                    aria-label={t('remove')}
                    className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white hover:text-ink"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            )}
        </div>
    );
}
