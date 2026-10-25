// Where an FAQ answer can link: the QR wedding page (shown only while it is live) or the plans.
export type OccasionFaqLinkTarget = 'qr' | 'pricing';

// One FAQ entry as the copy stores it (OccasionPages.<type>.faq). The answer may hold
// {range, select, …} price sentences.
export type OccasionFaqEntry = { q: string; a: string; link?: { to: OccasionFaqLinkTarget; label: string } };

// The FAQ in copy order with each answer formatted. format gets the answer's key ("faq.3.a").
export function occasionFaqEntries(raw: OccasionFaqEntry[], format: (key: string) => string): OccasionFaqEntry[] {
    return raw.map((entry, index) => ({ ...entry, a: format(`faq.${index}.a`) }));
}
