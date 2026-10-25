// Shapes of the wedding copy read with t.raw (OccasionPages.WEDDING). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

export type WeddingFeedReply = { author: string; text: string };

export type WeddingFeedPost = {
    author: string;
    time: string;
    caption: string;
    likes: number;
    comments: number;
    replies: [WeddingFeedReply, WeddingFeedReply];
};

// The music card between posts 6 and 7.
export type WeddingFeedMusic = {
    labels: [string, string, string];
    values: [string, string, string];
    kicker: string;
    title: string;
    time: string;
    cta: string;
};

// Labels every mocked StoryWall screen shares (OccasionPages.WEDDING.mock).
export type WeddingMockCopy = {
    units: [string, string, string, string];
    stories: { own: string; schedule: string; guests: string; moments: string; venue: string };
    scheduleBadge: [string, string];
    composer: string;
};

// hero.feed
export type WeddingHeroFeedCopy = { title: string; date: string; place: string; posts: WeddingFeedPost[]; music: WeddingFeedMusic };

// demo.feed
export type WeddingDemoFeedCopy = { title: string; date: string; place: string; author: string; time: string };

// demo.profile
export type WeddingDemoProfileCopy = {
    name: string;
    email: string;
    menu: [string, string, string];
    signOut: string;
    back: string;
    title: string;
    panelName: string;
    nameLabel: string;
};

// why.with.marquee[n]
export type WeddingMarqueeCopy = { name: string; role: string; moment: string };

// why.with.stats[n], rsvp.with.stats.tiles[n]
export type WeddingStatCopy = { value: string; label: string };

// rsvp.without.replies[n]
export type WeddingRsvpReplyCopy = { name: string; time: string; answer: string; going: boolean };

// rsvp.with.list[n]; the last row is cut off by the phone, so it has no note.
export type WeddingRsvpGuestCopy = { name: string; party: string; note?: string };

// rsvp.with.form
export type WeddingRsvpFormCopy = {
    title: string;
    attend: string;
    required: string;
    yes: string;
    no: string;
    companions: string;
    adults: string;
    children: string;
    message: string;
    optional: string;
    placeholder: string;
    counter: string;
    submit: string;
};

// rsvp.with.stats
export type WeddingRsvpStatsCopy = {
    active: string;
    tabs: [string, string, string];
    deadline: string;
    deadlineValue: string;
    tiles: [WeddingStatCopy, WeddingStatCopy, WeddingStatCopy, WeddingStatCopy];
    byCategory: string;
    coming: string;
    comingValue: string;
    comingShare: string;
    notComing: string;
    notComingValue: string;
};

// Title and body pairs: rsvp.checklist.items, private.cards.
export type WeddingCardCopy = { title: string; body: string };
