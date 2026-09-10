import React from 'react';

type LandingFeatureItemProps = {
    iconPath: string;
    label: string;
    clone?: boolean;
};

export function LandingFeatureItem({ clone = false, iconPath, label }: LandingFeatureItemProps) {
    return (
        <div
            aria-hidden={clone || undefined}
            className={`sw-feature-item${clone ? ' sw-marquee-clone' : ''}`}
            role="listitem"
            tabIndex={clone ? -1 : undefined}
        >
            <div className="sw-feature-icon">
                <span
                    aria-hidden="true"
                    className="sw-uploaded-gradient-icon"
                    style={{ '--sw-icon-mask': `url('${iconPath}')` } as React.CSSProperties}
                />
            </div>
            <div className="sw-feature-label">{label}</div>
        </div>
    );
}
