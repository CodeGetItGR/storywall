// A place's map link when the host didn't paste their own: a Google Maps
// search for its name and address.
export function mapsUrl(name: string, address: string): string {
    const query = [name, address].filter(Boolean).join(', ').trim();
    return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : 'https://maps.google.com';
}

// Hosts often type a website without https://.
export function websiteUrl(website: string): string {
    const trimmed = website.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
}
