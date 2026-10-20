import type { EventUsageResponseDto, PartnerRole, VendorCapability, VendorMeDto, VendorRowDto } from '@/lib/api/types';
import { APPLICATION_ROLES } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';

// One order everywhere vendor types are listed: the partner application's.
export const VENDOR_TYPES: readonly PartnerRole[] = APPLICATION_ROLES;

// The partner application's link rule, shared with the vendor profile (backend LINK_PATTERN).
const VENDOR_LINK_PATTERN = /^(https:\/\/\S{1,492}|@[A-Za-z0-9._]{1,60})$/;

export const VENDOR_BUSINESS_NAME_MAX = 80;
export const VENDOR_LINK_MAX = 500;

// Mirrors the backend VendorCapability enum. The backend sends an empty list while a vendor's
// tools are off, so this is how the screens know which tools a type has at all.
const CAPABILITY_TYPES: Record<VendorCapability, readonly PartnerRole[]> = {
    PRO_ALBUM: ['PHOTOGRAPHER', 'VIDEOGRAPHER'],
    SCHEDULE_EDIT: ['PLANNER'],
    ANNOUNCE: ['PLANNER'],
    RSVP_REPORT: ['PLANNER'],
    QR_READ: ['PLANNER'],
    SONG_REQUESTS: ['MUSIC'],
};

export function capabilitiesOfType(type: PartnerRole): VendorCapability[] {
    return (Object.keys(CAPABILITY_TYPES) as VendorCapability[]).filter((capability) => CAPABILITY_TYPES[capability].includes(type));
}

// A tool is open while the backend lists it and the access window is open.
export function hasVendorCapability(me: VendorMeDto | null | undefined, capability: VendorCapability): boolean {
    return Boolean(me?.accessOpen && me.capabilities.includes(capability));
}

// Built from the site URL, not window.location, so server and client render the same link.
export function vendorInviteUrl(inviteToken: string): string {
    return absoluteUrl(routes.inviteToken(inviteToken));
}

// The "Become a partner" sheet's attribution, read by readUtm like the landing page's.
export function vendorApplySearch(vendorType: PartnerRole): string {
    return `?utm_source=storywall-vendor&utm_medium=${vendorType}`;
}

export function isValidVendorLink(value: string): boolean {
    return VENDOR_LINK_PATTERN.test(value.trim());
}

// What guests see: a filled-in profile that neither the host nor the vendor hid.
// A host's list also carries hidden rows, so every guest-facing count goes through this.
export function listedVendors(rows: readonly VendorRowDto[]): VendorRowDto[] {
    return rows.filter((row) => row.businessName !== null && !row.hiddenByHost && !row.optedOut);
}

export type ProStorageState = { state: 'below' | 'at' | 'over'; percent: number; overflowBytes: number };

// The Pro allowance spills into event storage once full, so "over" is normal, not an error.
// A missing or zero allowance (the type has none, or the plan gives none) makes any use overflow;
// it never divides by zero.
export function proStorageState(usedBytes: number | null | undefined, allowanceBytes: number | null | undefined): ProStorageState {
    const used = Math.max(0, usedBytes ?? 0);
    const allowance = Math.max(0, allowanceBytes ?? 0);
    const overflowBytes = Math.max(0, used - allowance);
    if (overflowBytes > 0) return { state: 'over', percent: 100, overflowBytes };
    if (used === allowance) return { state: 'at', percent: 100, overflowBytes: 0 };
    return { state: 'below', percent: Math.round((used / allowance) * 100), overflowBytes: 0 };
}

// A copy of the rows in VENDOR_TYPES order.
export function sortByVendorType<T extends { vendorType: PartnerRole }>(rows: readonly T[]): T[] {
    return [...rows].sort((a, b) => VENDOR_TYPES.indexOf(a.vendorType) - VENDOR_TYPES.indexOf(b.vendorType));
}

// The outgoing link for a stored profile link: https as is, an @handle on Instagram.
export function vendorLinkHref(link: string | null | undefined): string | null {
    if (!link) return null;
    const value = link.trim();
    if (!isValidVendorLink(value)) return null;
    return value.startsWith('@') ? `https://instagram.com/${value.slice(1)}` : value;
}

// The vendors module gives this plan a Pro album allowance (0 or absent without the module).
export function hasProAllowance(usage: Pick<EventUsageResponseDto, 'proStorageBytes'> | null | undefined): boolean {
    return (usage?.proStorageBytes ?? 0) > 0;
}
