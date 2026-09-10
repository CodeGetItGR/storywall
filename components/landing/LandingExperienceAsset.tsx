import Image from 'next/image';

import { type LandingExperienceAsset as LandingExperienceAssetData } from '@/lib/landingExperienceMedia';

type LandingExperienceAssetProps = {
    alt: string;
    asset: LandingExperienceAssetData;
    host: boolean;
};

export function LandingExperienceAsset({ alt, asset, host }: LandingExperienceAssetProps) {
    return (
        <div className={asset.className} data-swx-p1={host ? undefined : ''} data-swx-p2={host ? '' : undefined}>
            <div className={host ? 'swx-host-ref-inner' : 'swx-ref-asset-inner'}>
                <Image alt={alt} decoding="async" loading="eager" src={asset.src} width={asset.width} height={asset.height} unoptimized />
            </div>
        </div>
    );
}
