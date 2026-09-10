import { Fragment } from 'react';

export type LandingTextSegment = { strong?: boolean; text: string };

type LandingStoryCopyProps = {
    paragraphSegments: LandingTextSegment[][];
    tag: string;
    titleSegments: LandingTextSegment[];
};

export function LandingStoryCopy({ paragraphSegments, tag, titleSegments }: LandingStoryCopyProps) {
    return (
        <div className="story-copy">
            <span>{tag}</span>
            <h3>
                {titleSegments.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong>{segment.text}</strong> : segment.text}</Fragment>
                ))}
            </h3>
            <p>
                {paragraphSegments[0]?.map((segment, index) => (
                    <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong>{segment.text}</strong> : segment.text}</Fragment>
                ))}
            </p>
            {paragraphSegments[1] ? (
                <div className="story-extra">
                    <p className="story-extra-text">
                        {paragraphSegments[1].map((segment, index) => (
                            <Fragment key={`${segment.text}-${index}`}>{segment.strong ? <strong>{segment.text}</strong> : segment.text}</Fragment>
                        ))}
                    </p>
                </div>
            ) : null}
        </div>
    );
}
