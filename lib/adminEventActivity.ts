import type { AdminEventActivityDto, AdminEventActivityHour } from '@/lib/api/types';
import { localDay } from '@/lib/datetime';

export { localDay } from '@/lib/datetime';

// Hours arrive as local wall-clock strings ("2026-06-14T23:00") in the event's time zone, so every
// helper here works on those strings and on UTC calendar arithmetic. No Date is ever read in the
// viewer's zone.

export type ActivityKind = 'posts' | 'stories' | 'gallery' | 'wishes';
export const ACTIVITY_KINDS: ActivityKind[] = ['posts', 'stories', 'gallery', 'wishes'];

// Fixed categorical order: the colour follows the kind, never its rank.
export const ACTIVITY_COLORS: Record<ActivityKind, string> = {
    posts: '#2a78d6',
    stories: '#eb6834',
    gallery: '#1baf7a',
    wishes: '#eda100',
};

// Tile icon tints for the counts that are not chart series.
export const TILE_TINTS = { reactions: '#d4537e', modules: '#6250d6', neutral: '#5f6b7a' } as const;

// The hover band behind a chart column; visible on the admin canvas.
export const CHART_CURSOR = { fill: 'var(--border)', fillOpacity: 0.6 };

// One blue ramp for the heatmap: the busiest cell at full strength, a faint tint for the quietest.
export function heatColor(value: number, max: number): string {
    return `rgba(42, 120, 214, ${0.12 + (value / Math.max(1, max)) * 0.88})`;
}

export const DAILY_MAX_DAYS = 60;
export const EARLIER_DAY = 'earlier';

type KindCounts = Record<ActivityKind, number>;
export type HourColumn = KindCounts & { hour: number; label: string; total: number };
export type DayColumn = KindCounts & { day: string; earlier: boolean; total: number };
export type Peak = { hour: string; total: number };

const zeroCounts = (): KindCounts => ({ posts: 0, stories: 0, gallery: 0, wishes: 0 });
const totalOf = (counts: KindCounts) => counts.posts + counts.stories + counts.gallery + counts.wishes;
const addInto = (target: KindCounts, source: KindCounts) => {
    for (const kind of ACTIVITY_KINDS) target[kind] += source[kind];
};

// The kind drawn on top of a stacked column: the last kind in the stack order with a count. A zero
// segment has no height, so the rounded top and the column total belong to this kind.
// The series the charts draw: wishes only when the event has the wishbook.
export function chartedKinds(totals: AdminEventActivityDto['totals']): ActivityKind[] {
    return totals.wishes === null ? ACTIVITY_KINDS.filter((kind) => kind !== 'wishes') : [...ACTIVITY_KINDS];
}

export function topKind(counts: KindCounts): ActivityKind | null {
    for (let index = ACTIVITY_KINDS.length - 1; index >= 0; index--) {
        if (counts[ACTIVITY_KINDS[index]] > 0) return ACTIVITY_KINDS[index];
    }
    return null;
}

const dayOf = (hour: string) => hour.slice(0, 10);
const hourOf = (hour: string) => Number(hour.slice(11, 13));
export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

function nextDay(day: string): string {
    const [year, month, date] = day.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, date + 1)).toISOString().slice(0, 10);
}

export function activeDays(hours: AdminEventActivityHour[]): string[] {
    return [...new Set(hours.map((row) => dayOf(row.hour)))].sort();
}

function totalsByDay(hours: AdminEventActivityHour[]): Map<string, KindCounts> {
    const byDay = new Map<string, KindCounts>();
    for (const row of hours) {
        const counts = byDay.get(dayOf(row.hour)) ?? zeroCounts();
        addInto(counts, row);
        byDay.set(dayOf(row.hour), counts);
    }
    return byDay;
}

export function defaultDay(hours: AdminEventActivityHour[], eventStartAt: string | null, timeZone: string): string | null {
    const days = activeDays(hours);
    if (days.length === 0) return null;
    if (eventStartAt) {
        const start = localDay(eventStartAt, timeZone);
        if (days.includes(start)) return start;
    }
    let busiest = days[0];
    let busiestTotal = -1;
    for (const [day, counts] of totalsByDay(hours)) {
        const total = totalOf(counts);
        if (total > busiestTotal || (total === busiestTotal && day < busiest)) {
            busiest = day;
            busiestTotal = total;
        }
    }
    return busiest;
}

export function shiftDay(days: string[], day: string, step: 1 | -1): string | null {
    const index = days.indexOf(day);
    if (index === -1) return null;
    return days[index + step] ?? null;
}

export function hourlyForDay(hours: AdminEventActivityHour[], day: string): HourColumn[] {
    const rows = hours.filter((row) => dayOf(row.hour) === day);
    if (rows.length === 0) return [];
    const byHour = new Map(rows.map((row) => [hourOf(row.hour), row]));
    const first = Math.min(...byHour.keys());
    const last = Math.max(...byHour.keys());
    const columns: HourColumn[] = [];
    for (let hour = first; hour <= last; hour++) {
        const row = byHour.get(hour);
        const counts = row ? { posts: row.posts, stories: row.stories, gallery: row.gallery, wishes: row.wishes } : zeroCounts();
        columns.push({ ...counts, hour, label: hourLabel(hour), total: totalOf(counts) });
    }
    return columns;
}

export function dailySeries(hours: AdminEventActivityHour[], maxDays = DAILY_MAX_DAYS): DayColumn[] {
    const days = activeDays(hours);
    if (days.length === 0) return [];
    const byDay = totalsByDay(hours);
    const all: string[] = [];
    for (let day = days[0]; day <= days[days.length - 1]; day = nextDay(day)) all.push(day);

    const kept = all.slice(-maxDays);
    const folded = all.slice(0, all.length - kept.length);
    const columns: DayColumn[] = kept.map((day) => {
        const counts = byDay.get(day) ?? zeroCounts();
        return { ...counts, day, earlier: false, total: totalOf(counts) };
    });
    if (folded.length > 0) {
        const counts = zeroCounts();
        for (const day of folded) addInto(counts, byDay.get(day) ?? zeroCounts());
        columns.unshift({ ...counts, day: EARLIER_DAY, earlier: true, total: totalOf(counts) });
    }
    return columns;
}

export function hourOfDayHeatmap(hours: AdminEventActivityHour[]): Record<ActivityKind, number[]> {
    const map = Object.fromEntries(ACTIVITY_KINDS.map((kind) => [kind, Array<number>(24).fill(0)])) as Record<ActivityKind, number[]>;
    for (const row of hours) {
        for (const kind of ACTIVITY_KINDS) map[kind][hourOf(row.hour)] += row[kind];
    }
    return map;
}

export function topPeaks(hours: AdminEventActivityHour[], count = 3): Peak[] {
    return hours
        .map((row) => ({ hour: row.hour, total: totalOf(row) }))
        .filter((peak) => peak.total > 0)
        .sort((a, b) => b.total - a.total || a.hour.localeCompare(b.hour))
        .slice(0, count);
}

export function contributedShare(members: AdminEventActivityDto['members']): number | null {
    return members.total === 0 ? null : members.contributed / members.total;
}

export type RemovedKind = keyof AdminEventActivityDto['removed'];
const REMOVED_KINDS: RemovedKind[] = ['posts', 'stories', 'galleryUploads', 'comments', 'wishes'];

// The removed kinds that have something to show, in a fixed order.
export function removedKinds(removed: AdminEventActivityDto['removed']): RemovedKind[] {
    return REMOVED_KINDS.filter((kind) => removed[kind] > 0);
}

// Each reaction with its count ("❤️ 12  👏 3"), using the code when there is no emoji. A no-break
// space keeps each emoji on the same line as its count.
export function reactionsSummary(reactions: AdminEventActivityDto['totals']['reactionsByType'], formatCount: (value: number) => string): string {
    return reactions.map((reaction) => `${reaction.emoji ?? reaction.code} ${formatCount(reaction.count)}`).join('  ');
}

export function removedTotal(removed: AdminEventActivityDto['removed']): number {
    return removed.posts + removed.stories + removed.galleryUploads + removed.comments + removed.wishes;
}

// A local day ("2026-06-14") or hour ("2026-06-14T23:00") as a Date at that wall-clock time in UTC,
// for Intl formatting with timeZone: 'UTC'.
export function wallClockDate(value: string): Date {
    const [year, month, date] = value.slice(0, 10).split('-').map(Number);
    const hour = value.length > 10 ? hourOf(value) : 0;
    return new Date(Date.UTC(year, month - 1, date, hour));
}
