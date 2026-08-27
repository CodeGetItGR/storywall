'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { modulePreviews } from '@/components/home/modulePreviews';
import { Modal } from '@/components/ui/modal';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import { routes } from '@/lib/routes';

export function HomeModuleDetailSheet({ module: showcaseModule, onCloseAction }: { module: ShowcaseModule | null; onCloseAction: () => void }) {
    const t = useTranslations('HomePage');
    const Preview = showcaseModule ? modulePreviews[showcaseModule.key] : null;

    return (
        <Modal open={Boolean(showcaseModule)} onClose={onCloseAction} size="sm" variant="sheet" closeLabel={t('modules.close')}>
            {showcaseModule && (
                <Modal.Body className="px-5 pt-12 pb-6">
                    {/* Preview */}
                    <div className="flex justify-center">
                        <div className="overflow-hidden rounded-[1.5rem] border border-border/70 shadow-[0_18px_36px_rgba(35,28,22,0.08)]">
                            {Preview && <Preview variant="detail" />}
                        </div>
                    </div>

                    {/* Details */}
                    <h2 className="mt-6 text-lg font-semibold text-ink">{showcaseModule.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-muted">{showcaseModule.detail}</p>
                </Modal.Body>
            )}
        </Modal>
    );
}
