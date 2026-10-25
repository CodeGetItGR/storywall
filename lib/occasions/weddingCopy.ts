// Shapes of the wedding copy read with t.raw (OccasionPages.WEDDING). Strings that hold <b>, <em> or
// <br></br> are read with t.rich by key instead, so they never pass through these types.

// why.with.marquee[n]
export type WeddingMarqueeCopy = { name: string; role: string; moment: string };

// why.with.stats[n]
export type WeddingStatCopy = { value: string; label: string };

// Title and body pairs: rsvp.checklist.items, private.cards.
export type WeddingCardCopy = { title: string; body: string };

// Splits a label at the space nearest its middle, for a button set on two lines. One word stays one line.
export function splitInTwoLines(label: string): [string] | [string, string] {
    const middle = label.length / 2;
    let best = -1;
    for (let space = label.indexOf(' '); space !== -1; space = label.indexOf(' ', space + 1)) {
        if (best === -1 || Math.abs(space - middle) < Math.abs(best - middle)) best = space;
    }
    return best === -1 ? [label] : [label.slice(0, best), label.slice(best + 1)];
}
