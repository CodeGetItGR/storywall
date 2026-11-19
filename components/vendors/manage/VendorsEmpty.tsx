'use client';

import { useTranslations } from 'next-intl';

import { VendorCapabilityRow } from '@/components/vendors/manage/VendorCapabilityRow';
import { VendorScene } from '@/components/vendors/manage/VendorScene';
import type { VendorCapabilityItem } from '@/hooks/useVendorCapabilities';
import type { VendorScene as Scene } from '@/hooks/useVendorScene';

// No vendor has joined yet: the event picture, the empty line, then what each allowed type can do.
export function VendorsEmpty({ scene, items }: { scene: Scene; items: VendorCapabilityItem[] }) {
    const t = useTranslations('Vendors');

    return (
        <div className="flex flex-col gap-4 pt-2">
            {/* Picture */}
            {scene.types.length > 0 && <VendorScene scene={scene} />}

            {/* Empty line */}
            <p className="text-sm text-ink-muted">{t('manage.joinedEmpty')}</p>

            {/* Types */}
            {items.length > 0 && (
                <ul className="grid grid-cols-1 gap-x-8 gap-y-3.5 md:grid-cols-2">
                    {items.map((item) => (
                        <VendorCapabilityRow key={item.type} item={item} marker="outline" />
                    ))}
                </ul>
            )}
        </div>
    );
}
