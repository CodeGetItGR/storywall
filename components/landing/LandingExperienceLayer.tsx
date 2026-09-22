import React from 'react';

import { LandingExperienceAsset } from '@/components/landing/LandingExperienceAsset';
import { type LandingExperienceAsset as LandingExperienceAssetData } from '@/lib/landingExperienceMedia';

type LandingExperienceLayerProps = {
    assets: LandingExperienceAssetData[];
    chapter: string;
    chapterCount: string;
    copy: string;
    host?: boolean;
    title: string[];
    topbar: string;
};

export function LandingExperienceLayer({ assets, chapter, chapterCount, copy, host = false, title, topbar }: LandingExperienceLayerProps) {
    return (
        <div className={`swx-layer ${host ? 'swx-layer-2' : 'swx-layer-1'}`}>
            {/* Chapter label */}
            <div className="swx-topbar">
                <span>{topbar}</span>
                <span>{chapterCount}</span>
            </div>
            <div className="swx-line" />

            {/* Heading */}
            <div className="swx-center">
                <div className="swx-chapter-no">{chapter}</div>
                <h2>
                    {title.map((line, index) => (
                        <React.Fragment key={line}>
                            {index ? <br /> : null}
                            {line}
                        </React.Fragment>
                    ))}
                </h2>
                <p>{copy}</p>
            </div>

            {/* Floating collage */}
            {assets.map((asset) => (
                <LandingExperienceAsset asset={asset} host={host} key={asset.src} />
            ))}
        </div>
    );
}
