const FALLBACK_TIMEZONES = [
    'Africa/Cairo',
    'Africa/Johannesburg',
    'America/Anchorage',
    'America/Argentina/Buenos_Aires',
    'America/Bogota',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/New_York',
    'America/Phoenix',
    'America/Sao_Paulo',
    'America/Toronto',
    'Asia/Dubai',
    'Asia/Hong_Kong',
    'Asia/Jerusalem',
    'Asia/Kolkata',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Melbourne',
    'Australia/Sydney',
    'Europe/Amsterdam',
    'Europe/Athens',
    'Europe/Berlin',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Paris',
    'Europe/Rome',
    'Pacific/Auckland',
    'Pacific/Honolulu',
    'UTC',
];

export function getCurrentTimezone() {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getSupportedTimezones(currentTimezone = getCurrentTimezone()) {
    const supportedValuesOf = Intl.supportedValuesOf;
    const timezones = typeof supportedValuesOf === 'function' ? supportedValuesOf('timeZone') : FALLBACK_TIMEZONES;

    return Array.from(new Set([currentTimezone, ...timezones])).sort((left, right) => left.localeCompare(right));
}
