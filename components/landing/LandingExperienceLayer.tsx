import React from 'react';

import { LandingExperienceAsset } from '@/components/landing/LandingExperienceAsset';
import { type LandingExperienceAsset as LandingExperienceAssetData } from '@/lib/landingExperienceMedia';

type LandingExperienceLayerProps = {
    assets: LandingExperienceAssetData[];
    chapter: string;
    chapterCount: string;
    copy: string;
    cue?: string;
    host?: boolean;
    phoneImage: string;
    title: string[];
    topbar: string;
};

export function LandingExperienceLayer({
    assets,
    chapter,
    chapterCount,
    copy,
    cue,
    host = false,
    phoneImage,
    title,
    topbar,
}: LandingExperienceLayerProps) {
    const phoneVariable = host ? '--swx-host-phone-bg' : '--swx-phone-bg';
    return (
        <div className={`swx-layer ${host ? 'swx-layer-2' : 'swx-layer-1'}`} id={host ? 'swxLayer2' : undefined}>
            <div
                aria-hidden="true"
                className={host ? 'swx-mobile-host-phone-visual' : 'swx-mobile-phone-visual'}
                style={{ [phoneVariable]: `url("${phoneImage}")` } as React.CSSProperties}
            />
            <div className="swx-topbar">
                <span>{topbar}</span>
                <span>{chapterCount}</span>
            </div>
            <div className="swx-line" />
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
            {assets.map((asset) => (
                <LandingExperienceAsset asset={asset} host={host} key={asset.src} />
            ))}
            {cue ? <div className="swx-cue">{cue} ↓</div> : null}
        </div>
    );
}
