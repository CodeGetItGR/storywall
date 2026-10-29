import { useTranslations } from 'next-intl';

import { ProtectedImage } from '@/components/common/ProtectedImage';
import { type LandingExperienceAsset as LandingExperienceAssetData } from '@/lib/landingExperienceMedia';

type LandingExperienceAssetProps = {
    asset: LandingExperienceAssetData;
    host: boolean;
};

export function LandingExperienceAsset({ asset, host }: LandingExperienceAssetProps) {
    const t = useTranslations('LandingPage.imageAlts');

    return (
        <div className={asset.className} data-swx-p1={host ? undefined : ''} data-swx-p2={host ? '' : undefined}>
            <div className={host ? 'swx-host-ref-inner' : 'swx-ref-asset-inner'}>
                <ProtectedImage unoptimized alt={t(asset.alt)} decoding="async" loading="lazy" src={asset.src} width={asset.width} height={asset.height} />
            </div>
        </div>
    );
}
