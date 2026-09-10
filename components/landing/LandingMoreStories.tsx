import Image from 'next/image';

import { landingMoreStoryImages } from '@/lib/landingMedia';

export type LandingMoreStory = { alt: string; label: string; text: string };

type LandingMoreStoriesProps = {
    ariaLabel: string;
    eyebrow: string;
    heading: string;
    mobileHint: string;
    stories: LandingMoreStory[];
};

export function LandingMoreStories({ ariaLabel, eyebrow, heading, mobileHint, stories }: LandingMoreStoriesProps) {
    return (
        <div className="sw-filmstrip-more">
            <div className="sw-filmstrip-intro">
                <div className="sw-filmstrip-eyebrow">{eyebrow}</div>
                <h3>{heading}</h3>
            </div>
            <div aria-label={ariaLabel} className="sw-filmstrip-track">
                {stories.map((story, index) => (
                    <button
                        aria-pressed={index === 0}
                        className={`sw-filmstrip-card${index === 0 ? ' is-active' : ''}`}
                        data-caption-text={story.text}
                        data-caption-title={story.label}
                        data-film-index={index}
                        key={story.label}
                        type="button"
                    >
                        <Image alt={story.alt} height={1} src={landingMoreStoryImages[index]} unoptimized width={1} />
                        <span aria-hidden="true" className="sw-filmstrip-plus">
                            +
                        </span>
                        <span className="sw-filmstrip-name">{story.label}</span>
                    </button>
                ))}
            </div>
            <div aria-live="polite" className="sw-filmstrip-caption">
                <strong className="sw-filmstrip-caption-title">{stories[0]?.label}</strong>
                <span className="sw-filmstrip-caption-text">{stories[0]?.text}</span>
            </div>
            <div className="sw-filmstrip-mobile-hint">{mobileHint}</div>
        </div>
    );
}
