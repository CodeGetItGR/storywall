export type LandingExperienceAsset = {
    className: string;
    height: number;
    src: string;
    width: number;
};

export const socialExperienceAssets: LandingExperienceAsset[] = [
    ['swx-ref-asset swx-a01 swx-depth-front swx-motion-emoji', '/landing/reaction-emoji.png', 161, 197],
    ['swx-ref-asset swx-a02 swx-depth-mid swx-motion-card', '/landing/baptism-story.webp', 653, 884],
    ['swx-ref-asset swx-a03 swx-depth-mid swx-motion-card', '/landing/wedding-social-post.png', 498, 593],
    ['swx-ref-asset swx-a04 swx-depth-front swx-motion-emoji', '/landing/champagne-reaction.png', 205, 226],
    ['swx-ref-asset swx-a05 swx-depth-front swx-motion-comment', '/landing/guest-comment.png', 446, 153],
    ['swx-ref-asset swx-a06 swx-depth-front swx-motion-emoji', '/landing/heart-reaction.png', 131, 113],
    ['swx-ref-asset swx-a07 swx-depth-front swx-motion-avatar', '/landing/guest-avatar.png', 306, 301],
    ['swx-ref-asset swx-a08 swx-depth-front swx-motion-emoji', '/landing/heart-eyes-reaction.png', 282, 225],
    ['swx-ref-asset swx-a09 swx-depth-back swx-motion-card', '/landing/wedding-post.png', 388, 468],
    ['swx-ref-asset swx-a11 swx-depth-front swx-motion-comment', '/landing/guest-comment-2.png', 440, 286],
    ['swx-ref-asset swx-a12 swx-depth-mid swx-motion-card', '/landing/party-social-post.png', 613, 462],
    ['swx-ref-asset swx-a13 swx-depth-front swx-motion-emoji', '/landing/laugh-reaction.png', 117, 112],
    ['swx-ref-asset swx-a14 swx-depth-front swx-motion-emoji', '/landing/heart-reaction-2.png', 91, 82],
    ['swx-ref-asset swx-a15 swx-depth-front swx-motion-avatar', '/landing/party-avatar.png', 222, 224],
    ['swx-ref-asset swx-a16 swx-depth-mid swx-motion-card', '/landing/wedding-social-post-2.png', 532, 737],
    ['swx-ref-asset swx-a17 swx-depth-mid swx-motion-card', '/landing/party-story.png', 751, 887],
    ['swx-ref-asset swx-a18 swx-depth-front swx-motion-music', '/landing/music-request.png', 601, 478],
    ['swx-ref-asset swx-a19 swx-depth-front swx-motion-emoji', '/landing/wink-reaction.png', 224, 199],
    ['swx-ref-asset swx-a20 swx-depth-back swx-motion-card', '/landing/blurred-social-post.webp', 547, 514],
    ['swx-ref-asset swx-a21 swx-depth-back swx-motion-comment', '/landing/blurred-comment.webp', 384, 211],
    ['swx-ref-asset swx-a22 swx-depth-front swx-motion-note', '/landing/music-note-reaction.png', 212, 235],
].map(([className, src, width, height]) => ({ className, src, width, height })) as LandingExperienceAsset[];

export const hostExperienceAssets: LandingExperienceAsset[] = [
    ['swx-host-ref swx-h01 swx-host-depth-front swx-host-motion-report', '/landing/rsvp-material-report.png', 1049, 550],
    ['swx-host-ref swx-h02 swx-host-depth-mid swx-host-motion-card', '/landing/venue-map-card.png', 450, 390],
    ['swx-host-ref swx-h03 swx-host-depth-front swx-host-motion-card', '/landing/thank-you-bank-details.png', 463, 545],
    ['swx-host-ref swx-h04 swx-host-depth-front swx-host-motion-card', '/landing/ceremony-map-card.webp', 349, 352],
    ['swx-host-ref swx-h05 swx-host-depth-mid swx-host-motion-card', '/landing/host-photo-gallery.png', 625, 800],
    ['swx-host-ref swx-h06 swx-host-depth-front swx-host-motion-avatar', '/landing/guest-avatar-2.png', 334, 274],
    ['swx-host-ref swx-h07 swx-host-depth-front swx-host-motion-music', '/landing/music-requests-card.png', 556, 478],
    ['swx-host-ref swx-h08 swx-host-depth-mid swx-host-motion-story', '/landing/baptism-story-2.webp', 430, 675],
    ['swx-host-ref swx-h09 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-emily-johnson.png', 638, 236],
    ['swx-host-ref swx-h10 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-maria-papadopoulou.png', 591, 326],
    ['swx-host-ref swx-h11 swx-host-depth-front swx-host-motion-menu', '/landing/create-content-menu.webp', 693, 849],
    ['swx-host-ref swx-h12 swx-host-depth-mid swx-host-motion-dashboard', '/landing/host-statistics-dashboard.png', 988, 1119],
    ['swx-host-ref swx-h13 swx-host-depth-back swx-host-motion-card', '/landing/cropped-post-card.png', 645, 202],
].map(([className, src, width, height]) => ({ className, src, width, height })) as LandingExperienceAsset[];
