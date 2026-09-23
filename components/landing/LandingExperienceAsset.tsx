import { ProtectedImage } from '@/components/common/ProtectedImage';
import { type LandingExperienceAsset as LandingExperienceAssetData } from '@/lib/landingExperienceMedia';

type LandingExperienceAssetProps = {
    asset: LandingExperienceAssetData;
    host: boolean;
};

// Collage fragments are visual texture behind the layer's own heading and
// copy, so they stay out of the accessibility tree entirely.
export function LandingExperienceAsset({ asset, host }: LandingExperienceAssetProps) {
    return (
        <div className={asset.className} data-swx-p1={host ? undefined : ''} data-swx-p2={host ? '' : undefined}>
            <div className={host ? 'swx-host-ref-inner' : 'swx-ref-asset-inner'}>
                <ProtectedImage unoptimized alt="" decoding="async" loading="lazy" src={asset.src} width={asset.width} height={asset.height} />
            </div>
        </div>
    );
}
