import type { HeOrSheValue, HeOrSheViewDto } from '@/lib/api/types';

type Tally = { he: number; she: number };

// What the feed's Boy or Girl section shows. guess: the Boy / Girl choice. guessed: the member's guess, while voting
// is open (no tally yet). tally: a host's view while voting is open. closed: the result, with the guess if any.
export type HeOrSheFeedView =
    | { kind: 'guess' }
    | { kind: 'guessed'; guess: HeOrSheValue }
    | { kind: 'tally'; tally: Tally }
    | { kind: 'closed'; guess: HeOrSheValue | null; tally: Tally };

// The server sends the tally to hosts, to members who voted, and to everyone once voting closes. While voting is open
// a host always sees it (a host can guess too, on the Boy or Girl page), so a tally before a guess means a host.
export function heOrSheFeedView(view: HeOrSheViewDto | null | undefined, isHost = false): HeOrSheFeedView | null {
    if (!view) return null;
    if (view.status === 'CLOSED') return view.tally ? { kind: 'closed', guess: view.myGuess, tally: view.tally } : null;
    if (view.tally && (isHost || view.myGuess === null)) return { kind: 'tally', tally: view.tally };
    if (view.myGuess !== null) return { kind: 'guessed', guess: view.myGuess };
    return view.canGuess ? { kind: 'guess' } : null;
}
