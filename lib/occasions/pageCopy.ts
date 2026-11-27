import type { getTranslations } from 'next-intl/server';

// Shapes of an occasion page's copy read with t.raw (OccasionPages.<type>). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

// What the section props builders read copy through: getTranslations() on the server, a
// createTranslator() in stories (cast, same runtime shape).
export type PageTranslator = Awaited<ReturnType<typeof getTranslations>>;

// why.with.marquee[n]: a guest's photo. The alt is built from `moment` with why.with.photoAlt,
// or given whole as `alt` where the words need other forms (Greek cases).
export type OccasionGuestPhotoCopy = { name: string; role: string; moment?: string; alt?: string };

// why.with.stats[n]
export type OccasionStatCopy = { value: string; label: string };

// Title and body pairs: rsvp.checklist.items, private.cards.
export type OccasionCardCopy = { title: string; body: string };
