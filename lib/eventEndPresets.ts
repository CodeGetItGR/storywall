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

export function getEventEndPresets(_eventType: EventTypeConvention, startAt: string): EventEndPreset[] {
    return SHORT_EVENT_PRESETS.map(({ duration, ...preset }) => ({
        ...preset,
        value: addDatetimeLocalDuration(startAt, duration),
    }));
}
