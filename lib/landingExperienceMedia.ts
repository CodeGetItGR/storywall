export type LandingExperienceAsset = {
    className: string;
    height: number;
    src: string;
    width: number;
    // A key under LandingPage.imageAlts.
    alt: string;
};

export const socialExperienceAssets: LandingExperienceAsset[] = [
    ['swx-ref-asset swx-a01 swx-depth-front swx-motion-emoji', '/landing/reaction-emoji.webp', 161, 197, 'surprised'],
    ['swx-ref-asset swx-a02 swx-depth-mid swx-motion-card', '/landing/baptism-story.webp', 653, 884, 'baptismStory'],
    ['swx-ref-asset swx-a03 swx-depth-mid swx-motion-card', '/landing/wedding-social-post.webp', 498, 593, 'weddingPost'],
    ['swx-ref-asset swx-a04 swx-depth-front swx-motion-emoji', '/landing/champagne-reaction.webp', 205, 226, 'champagne'],
    ['swx-ref-asset swx-a05 swx-depth-front swx-motion-comment', '/landing/guest-comment.webp', 446, 153, 'guestComment'],
    ['swx-ref-asset swx-a06 swx-depth-front swx-motion-emoji', '/landing/heart-reaction.webp', 131, 113, 'heart'],
    ['swx-ref-asset swx-a07 swx-depth-front swx-motion-avatar', '/landing/guest-avatar.webp', 306, 301, 'guestAvatar'],
    ['swx-ref-asset swx-a08 swx-depth-front swx-motion-emoji', '/landing/heart-eyes-reaction.webp', 282, 225, 'heartEyes'],
    ['swx-ref-asset swx-a09 swx-depth-back swx-motion-card', '/landing/wedding-post.webp', 388, 468, 'weddingPost'],
    ['swx-ref-asset swx-a11 swx-depth-front swx-motion-comment', '/landing/guest-comment-2.webp', 440, 286, 'guestComment'],
    ['swx-ref-asset swx-a12 swx-depth-mid swx-motion-card', '/landing/party-social-post.webp', 613, 462, 'partyPost'],
    ['swx-ref-asset swx-a13 swx-depth-front swx-motion-emoji', '/landing/laugh-reaction.webp', 117, 112, 'tearsOfJoy'],
    ['swx-ref-asset swx-a14 swx-depth-front swx-motion-emoji', '/landing/heart-reaction-2.webp', 91, 82, 'heart'],
    ['swx-ref-asset swx-a15 swx-depth-front swx-motion-avatar', '/landing/party-avatar.webp', 222, 224, 'guestAvatar'],
    ['swx-ref-asset swx-a16 swx-depth-mid swx-motion-card', '/landing/wedding-social-post-2.webp', 532, 737, 'weddingPost'],
    ['swx-ref-asset swx-a17 swx-depth-mid swx-motion-card', '/landing/party-story.webp', 751, 887, 'partyStory'],
    ['swx-ref-asset swx-a18 swx-depth-front swx-motion-music', '/landing/music-request.webp', 601, 478, 'songRequest'],
    ['swx-ref-asset swx-a19 swx-depth-front swx-motion-emoji', '/landing/wink-reaction.webp', 224, 199, 'wink'],
    ['swx-ref-asset swx-a20 swx-depth-back swx-motion-card', '/landing/blurred-social-post.webp', 547, 514, 'guestPost'],
    ['swx-ref-asset swx-a21 swx-depth-back swx-motion-comment', '/landing/blurred-comment.webp', 384, 211, 'guestComment'],
    ['swx-ref-asset swx-a22 swx-depth-front swx-motion-note', '/landing/music-note-reaction.webp', 212, 235, 'musicNote'],
].map(([className, src, width, height, alt]) => ({ className, src, width, height, alt })) as LandingExperienceAsset[];

export const hostExperienceAssets: LandingExperienceAsset[] = [
    ['swx-host-ref swx-h01 swx-host-depth-front swx-host-motion-report', '/landing/rsvp-material-report.webp', 1049, 550, 'rsvpReport'],
    ['swx-host-ref swx-h02 swx-host-depth-mid swx-host-motion-card', '/landing/venue-map-card.webp', 450, 390, 'receptionMap'],
    ['swx-host-ref swx-h03 swx-host-depth-front swx-host-motion-card', '/landing/thank-you-bank-details.webp', 463, 545, 'giftDetails'],
    ['swx-host-ref swx-h04 swx-host-depth-front swx-host-motion-card', '/landing/ceremony-map-card.webp', 349, 352, 'ceremonyMap'],
    ['swx-host-ref swx-h05 swx-host-depth-mid swx-host-motion-card', '/landing/host-photo-gallery.webp', 625, 800, 'photoGallery'],
    ['swx-host-ref swx-h06 swx-host-depth-front swx-host-motion-avatar', '/landing/guest-avatar-2.webp', 334, 274, 'guestAvatar'],
    ['swx-host-ref swx-h07 swx-host-depth-front swx-host-motion-music', '/landing/music-requests-card.webp', 556, 478, 'songRequests'],
    ['swx-host-ref swx-h08 swx-host-depth-mid swx-host-motion-story', '/landing/baptism-story-2.webp', 430, 675, 'baptismStory'],
    ['swx-host-ref swx-h09 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-emily-johnson.webp', 638, 236, 'emilyComment'],
    ['swx-host-ref swx-h10 swx-host-depth-front swx-host-motion-comment', '/landing/guest-comment-maria-papadopoulou.webp', 591, 326, 'mariaComment'],
    ['swx-host-ref swx-h11 swx-host-depth-front swx-host-motion-menu', '/landing/create-content-menu.webp', 693, 849, 'createMenu'],
    ['swx-host-ref swx-h12 swx-host-depth-mid swx-host-motion-dashboard', '/landing/host-statistics-dashboard.webp', 988, 1119, 'hostStats'],
    ['swx-host-ref swx-h13 swx-host-depth-back swx-host-motion-card', '/landing/cropped-post-card.webp', 645, 202, 'guestPost'],
].map(([className, src, width, height, alt]) => ({ className, src, width, height, alt })) as LandingExperienceAsset[];
