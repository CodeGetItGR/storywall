// The countdown to the invitation's date (old updateCountdowns). The date is
// read as the guest's own local time, as the old page did, and the numbers
// stop at zero once it has passed.

export type CountdownParts = { days: string; hours: string; mins: string; secs: string };

export const COUNTDOWN_ZERO: CountdownParts = { days: '0', hours: '0', mins: '0', secs: '0' };

export function countdownParts(targetIso: string | undefined, now: number): CountdownParts {
    if (!targetIso) return COUNTDOWN_ZERO;
    const target = new Date(targetIso).getTime();
    if (Number.isNaN(target)) return COUNTDOWN_ZERO;
    const diff = Math.max(0, target - now);
    const pad = (value: number) => String(value).padStart(2, '0');
    return {
        days: String(Math.floor(diff / 86_400_000)),
        hours: pad(Math.floor(diff / 3_600_000) % 24),
        mins: pad(Math.floor(diff / 60_000) % 60),
        secs: pad(Math.floor(diff / 1000) % 60),
    };
}
