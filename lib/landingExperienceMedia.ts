export type LandingExperienceAsset = {
    className: string;
    height: number;
    src: string;
    width: number;
};

export const socialExperienceAssets: LandingExperienceAsset[] = [
    ['swx-ref-asset swx-a01 swx-depth-front swx-motion-emoji', '/landing/reaction-emoji.webp', 161, 197],
    ['swx-ref-asset swx-a02 swx-depth-mid swx-motion-card', '/landing/baptism-story.webp', 653, 884],
    ['swx-ref-asset swx-a03 swx-depth-mid swx-motion-card', '/landing/wedding-social-post.webp', 498, 593],
    ['swx-ref-asset swx-a04 swx-depth-front swx-motion-emoji', '/landing/champagne-reaction.webp', 205, 226],
    ['swx-ref-asset swx-a05 swx-depth-front swx-motion-comment', '/landing/guest-comment.webp', 446, 153],
    ['swx-ref-asset swx-a06 swx-depth-front swx-motion-emoji', '/landing/heart-reaction.webp', 131, 113],
    ['swx-ref-asset swx-a07 swx-depth-front swx-motion-avatar', '/landing/guest-avatar.webp', 306, 301],
    ['swx-ref-asset swx-a08 swx-depth-front swx-motion-emoji', '/landing/heart-eyes-reaction.webp', 282, 225],
    ['swx-ref-asset swx-a09 swx-depth-back swx-motion-card', '/landing/wedding-post.webp', 388, 468],
    ['swx-ref-asset swx-a11 swx-depth-front swx-motion-comment', '/landing/guest-comment-2.webp', 440, 286],
    ['swx-ref-asset swx-a12 swx-depth-mid swx-motion-card', '/landing/party-social-post.webp', 613, 462],
    ['swx-ref-asset swx-a13 swx-depth-front swx-motion-emoji', '/landing/laugh-reaction.webp', 117, 112],
    ['swx-ref-asset swx-a14 swx-depth-front swx-motion-emoji', '/landing/heart-reaction-2.webp', 91, 82],
    ['swx-ref-asset swx-a15 swx-depth-front swx-motion-avatar', '/landing/party-avatar.webp', 222, 224],
    ['swx-ref-asset swx-a16 swx-depth-mid swx-motion-card', '/landing/wedding-social-post-2.webp', 532, 737],
    ['swx-ref-asset swx-a17 swx-depth-mid swx-motion-card', '/landing/party-story.webp', 751, 887],
    ['swx-ref-asset swx-a18 swx-depth-front swx-motion-music', '/landing/music-request.webp', 601, 478],
    ['swx-ref-asset swx-a19 swx-depth-front swx-motion-emoji', '/landing/wink-reaction.webp', 224, 199],
    ['swx-ref-asset swx-a20 swx-depth-back swx-motion-card', '/landing/blurred-social-post.webp', 547, 514],
    ['swx-ref-asset swx-a21 swx-depth-back swx-motion-comment', '/landing/blurred-comment.webp', 384, 211],
    ['swx-ref-asset swx-a22 swx-depth-front swx-motion-note', '/landing/music-note-reaction.webp', 212, 235],
].map(([className, src, width, height]) => ({ className, src, width, height })) as LandingExperienceAsset[];

export const hostExperienceAssets: LandingExperienceAsset[] = [
    ['swx-host-ref swx-h01 swx-host-depth-front swx-host-motion-report', '/landing/rsvp-material-report.webp', 1049, 550],
    ['swx-host-ref swx-h02 swx-host-depth-mid swx-host-motion-card', '/landing/venue-map-card.webp', 450, 390],
    ['swx-host-ref swx-h03 swx-host-depth-front swx-host-motion-card', '/landing/thank-you-bank-details.webp', 463, 545],
    ['swx-host-ref swx-h04 swx-host-depth-front swx-host-motion-card', '/landing/ceremony-map-card.webp', 349, 352],
    ['swx-host-ref swx-h05 swx-host-depth-mid swx-host-motion-card', '/landing/host-photo-gallery.webp', 625, 800],
    ['swx-host-ref swx-h06 swx-host-depth-front swx-host-motion-avatar', '/landing/guest-avatar-2.webp', 334, 274],
    ['swx-host-ref swx-h07 swx-host-depth-front swx-host-motion-music', '/landing/music-requests-card.webp', 556, 478],
    ['swx-host-ref swx-h08 swx-host-depth-mid swx-host-motion-story', '/landing/baptism-story-2.webp', 430, 675],
    ['swx-host-ref swx-h09 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-emily-johnson.webp', 638, 236],
    ['swx-host-ref swx-h10 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-maria-papadopoulou.webp', 591, 326],
    ['swx-host-ref swx-h11 swx-host-depth-front swx-host-motion-menu', '/landing/create-content-menu.webp', 693, 849],
    ['swx-host-ref swx-h12 swx-host-depth-mid swx-host-motion-dashboard', '/landing/host-statistics-dashboard.webp', 988, 1119],
    ['swx-host-ref swx-h13 swx-host-depth-back swx-host-motion-card', '/landing/cropped-post-card.webp', 645, 202],
].map(([className, src, width, height]) => ({ className, src, width, height })) as LandingExperienceAsset[];
