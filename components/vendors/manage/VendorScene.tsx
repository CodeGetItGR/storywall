import { VendorSceneArt } from '@/components/vendors/manage/VendorSceneArt';
import { VENDOR_TYPE_ICONS } from '@/components/vendors/manage/vendorTypeIcons';
import type { VendorScene as Scene } from '@/hooks/useVendorScene';
import { vendorSceneMarkerPosition } from '@/lib/vendors';

// The empty-state picture, faded, with a coral marker over each vendor it draws.
export function VendorScene({ scene }: { scene: Scene }) {
    return (
        <div role="img" aria-label={scene.alt} className="relative">
            {/* Picture */}
            <div className="opacity-60">
                <VendorSceneArt types={scene.types} />
            </div>

            {/* Markers */}
            {scene.types.map((type) => {
                const Icon = VENDOR_TYPE_ICONS[type];
                const { left, top } = vendorSceneMarkerPosition(type);
                return (
                    <span
                        key={type}
                        aria-hidden="true"
                        style={{ left: `${left}%`, top: `${top}%` }}
                        className="absolute flex size-5 -translate-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white md:size-6"
                    >
                        <Icon className="size-2.5 md:size-3" strokeWidth={2.5} />
                    </span>
                );
            })}
        </div>
    );
}
