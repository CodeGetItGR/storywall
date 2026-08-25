import type { EventTypeConvention } from '@/lib/api/types';
import { addDatetimeLocalDuration } from '@/lib/datetime';

export type EventEndPreset = {
    key: string;
    labelKey: 'fourHours' | 'oneDay' | 'twoDays' | 'threeDays' | 'oneWeek';
    value: string | null;
};

type EventEndPresetConfig = Omit<EventEndPreset, 'value'> & {
    duration: { days?: number; hours?: number };
};

const SHORT_EVENT_PRESETS: EventEndPresetConfig[] = [
    { key: '4h', labelKey: 'fourHours', duration: { hours: 4 } },
    { key: '1d', labelKey: 'oneDay', duration: { days: 1 } },
    { key: '2d', labelKey: 'twoDays', duration: { days: 2 } },
    { key: '1w', labelKey: 'oneWeek', duration: { days: 7 } },
];

const MULTI_DAY_EVENT_PRESETS: EventEndPresetConfig[] = [
    { key: '1d', labelKey: 'oneDay', duration: { days: 1 } },
    { key: '2d', labelKey: 'twoDays', duration: { days: 2 } },
    { key: '3d', labelKey: 'threeDays', duration: { days: 3 } },
    { key: '1w', labelKey: 'oneWeek', duration: { days: 7 } },
];

const MULTI_DAY_EVENT_TYPES = new Set<EventTypeConvention>(['CONFERENCE', 'CORPORATE', 'FESTIVAL']);

export function getEventEndPresets(eventType: EventTypeConvention, startAt: string): EventEndPreset[] {
    const presets = MULTI_DAY_EVENT_TYPES.has(eventType) ? MULTI_DAY_EVENT_PRESETS : SHORT_EVENT_PRESETS;

    return presets.map(({ duration, ...preset }) => ({
        ...preset,
        value: addDatetimeLocalDuration(startAt, duration),
    }));
}
