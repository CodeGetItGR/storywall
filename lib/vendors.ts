import type {
    EventModuleResponseDto,
    EventUsageResponseDto,
    PartnerRole,
    VendorCapability,
    VendorMeDto,
    VendorRowDto,
    VendorServiceTag,
} from '@/lib/api/types';
import { APPLICATION_ROLES } from '@/lib/forBusinessApplication';
import { routes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';

// Whether the signed-in vendor's own details exist: 'missing' only once the read succeeded with nothing.
// A failed read or a read that never runs counts as 'ready', so the backend's refusal is what the vendor sees.
export type ProfileStatus = 'loading' | 'missing' | 'ready';

export function vendorProfileStatus(query: { isSuccess: boolean; isError: boolean; fetchStatus: string; data?: unknown }): ProfileStatus {
    if (query.isSuccess) return query.data ? 'ready' : 'missing';
    if (query.isError || query.fetchStatus === 'idle') return 'ready';
    return 'loading';
}

// Whether the profile can be edited: only once it has loaded (a missing profile counts), since the edit form starts
// from it. A read that failed with nothing to show gets a retry instead; one that hasn't finished keeps Edit off.
export type ProfileLoadState = 'loading' | 'failed' | 'ready';

export function profileLoadState(query: { isSuccess: boolean; isError: boolean; data?: unknown }): ProfileLoadState {
    if (query.isSuccess || query.data !== undefined) return 'ready';
    if (query.isError) return 'failed';
    return 'loading';
}

// One order everywhere vendor types are listed: the partner application's.
export const VENDOR_TYPES: readonly PartnerRole[] = APPLICATION_ROLES;

export const VENDOR_BUSINESS_NAME_MAX = 80;
export const VENDOR_DESCRIPTION_MAX = 120;
export const VENDOR_WEBSITE_MAX = 500;
export const VENDOR_PHONE_MAX = 40;
export const VENDOR_EMAIL_MAX = 254;
export const VENDOR_SERVICE_TAGS_MAX = 5;

// The services each type can show on its card, in the order the sheet offers them (backend VendorServiceTag).
export const VENDOR_SERVICE_TAGS: Record<PartnerRole, readonly VendorServiceTag[]> = {
    PHOTOGRAPHER: ['DRONE', 'ALBUM', 'PRINTS', 'PHOTO_BOOTH', 'PRE_WEDDING', 'SAME_DAY_EDIT'],
    VIDEOGRAPHER: ['DRONE', 'HIGHLIGHTS', 'FULL_FILM', 'SAME_DAY_EDIT', 'LIVE_STREAMING'],
    MUSIC: ['DJ', 'LIVE_MUSIC', 'SOUND', 'LIGHTING', 'CHURCH', 'DANCE_FLOOR'],
    DECORATION: ['FLOWERS', 'CHURCH', 'TABLES', 'LIGHTING', 'BALLOONS', 'BAPTISM'],
    CATERING: ['BUFFET', 'SERVED', 'SWEETS', 'CAKE', 'BAR', 'FINGER_FOOD'],
    VENUE: ['OUTDOOR', 'INDOOR', 'SEASIDE', 'ACCOMMODATION', 'PARKING', 'CHURCH_NEARBY'],
    PLANNER: ['FULL_PLANNING', 'DAY_COORDINATION', 'DESTINATION', 'BUDGET', 'SUPPLIERS'],
    OTHER: [],
};

// The backend's rules for the card's links and contact details.
const INSTAGRAM_HANDLE = /^@?[A-Za-z0-9._]{1,60}$/;
const INSTAGRAM_PROFILE_URL = /^https:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,60})\/?(?:\?\S*)?$/i;
const WEBSITE = /^https:\/\/\S{1,492}$/;
const PHONE = /^\+?[0-9 ()-]{6,40}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The Instagram field as a handle without the @: a handle, with or without the @, or the profile's address.
// Null for anything else.
export function instagramHandle(value: string): string | null {
    const input = value.trim();
    const url = INSTAGRAM_PROFILE_URL.exec(input);
    if (url) return url[1];
    return INSTAGRAM_HANDLE.test(input) ? input.replace(/^@/, '') : null;
}

export function isValidVendorWebsite(value: string): boolean {
    return WEBSITE.test(value.trim());
}

export function isValidVendorPhone(value: string): boolean {
    return PHONE.test(value.trim());
}

export function isValidVendorEmail(value: string): boolean {
    return EMAIL.test(value.trim());
}

// The card's Instagram link. Null without a valid handle.
export function instagramHref(handle: string | null | undefined): string | null {
    const value = handle ? instagramHandle(handle) : null;
    return value ? `https://instagram.com/${value}` : null;
}

// The card's website link: https only, so a stored value can never open anything else.
export function websiteHref(website: string | null | undefined): string | null {
    return website && isValidVendorWebsite(website) ? website.trim() : null;
}

// The type's own tags from a list, each once, in the vendor's order, at most VENDOR_SERVICE_TAGS_MAX.
export function serviceTagsForType(tags: readonly VendorServiceTag[] | null | undefined, type: PartnerRole): VendorServiceTag[] {
    const allowed = VENDOR_SERVICE_TAGS[type];
    return [...new Set(tags ?? [])].filter((tag) => allowed.includes(tag)).slice(0, VENDOR_SERVICE_TAGS_MAX);
}

export type VendorCardActionKind = 'instagram' | 'website' | 'call' | 'email';
export type VendorCardAction = { kind: VendorCardActionKind; href: string };

// The buttons on a guest's vendor card, in this order, for each detail the row carries and that is safe to open.
// The backend sends a phone and an email only for an approved partner who chose to show them.
export function vendorCardActions(vendor: Pick<VendorRowDto, 'instagram' | 'website' | 'phone' | 'email'>): VendorCardAction[] {
    const actions: VendorCardAction[] = [];
    const instagram = instagramHref(vendor.instagram);
    if (instagram) actions.push({ kind: 'instagram', href: instagram });
    const website = websiteHref(vendor.website);
    if (website) actions.push({ kind: 'website', href: website });
    if (vendor.phone && isValidVendorPhone(vendor.phone)) actions.push({ kind: 'call', href: `tel:${vendor.phone.replace(/[^\d+]/g, '')}` });
    if (vendor.email && isValidVendorEmail(vendor.email)) actions.push({ kind: 'email', href: `mailto:${vendor.email.trim()}` });
    return actions;
}

// Mirrors the backend VendorCapability enum. The backend sends an empty list while a vendor's
// tools are off, so this is how the screens know which tools a type has at all.
const CAPABILITY_TYPES: Record<VendorCapability, readonly PartnerRole[]> = {
    PRO_ALBUM: ['PHOTOGRAPHER', 'VIDEOGRAPHER'],
    SCHEDULE_EDIT: ['PLANNER'],
    ANNOUNCE: ['PLANNER'],
    RSVP_REPORT: ['PLANNER'],
    QR_READ: ['PLANNER'],
    SONG_REQUESTS: ['MUSIC'],
    PRINT_PICKS: ['PHOTOGRAPHER'],
    SNEAK_PEEK: ['PHOTOGRAPHER', 'VIDEOGRAPHER'],
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

// The vendors module gives this plan a Pro album allowance (0 or absent without the module).
export function hasProAllowance(usage: Pick<EventUsageResponseDto, 'proStorageBytes'> | null | undefined): boolean {
    return (usage?.proStorageBytes ?? 0) > 0;
}

export type VendorToolKey = 'schedule' | 'announcement' | 'rsvpReport' | 'qr' | 'liveRequests';

// The vendor page's tool links, in this order. The Pro album is on the page itself, so it has no link.
// moduleKey: the module the tool's screen needs (the tools menu hides it the same way).
const VENDOR_TOOLS: { key: VendorToolKey; capability: VendorCapability; moduleKey?: string; href: (eventId: string) => string }[] = [
    { key: 'schedule', capability: 'SCHEDULE_EDIT', href: (eventId) => routes.events.tools.schedule(eventId) },
    // The feed composer in Announcement mode.
    { key: 'announcement', capability: 'ANNOUNCE', moduleKey: 'posts', href: (eventId) => routes.events.feed(eventId, { compose: 'announcement' }) },
    { key: 'rsvpReport', capability: 'RSVP_REPORT', moduleKey: 'rsvp', href: (eventId) => routes.events.rsvpReport(eventId, 'FULL_LIST', 'vendor') },
    { key: 'qr', capability: 'QR_READ', href: (eventId) => routes.events.invitationsQr(eventId) },
    { key: 'liveRequests', capability: 'SONG_REQUESTS', moduleKey: 'playlist', href: (eventId) => routes.events.tools.playlistLive(eventId) },
];

// Without readableModules every open tool is listed; with it, tools whose module is off are left out.
export function vendorToolLinks(eventId: string, me: VendorMeDto, readableModules?: ReadonlySet<string>): { key: VendorToolKey; href: string }[] {
    return VENDOR_TOOLS.filter((tool) => hasVendorCapability(me, tool.capability))
        .filter((tool) => !readableModules || !tool.moduleKey || readableModules.has(tool.moduleKey))
        .map((tool) => ({ key: tool.key, href: tool.href(eventId) }));
}

// Parts of the vendor page the feed's quick actions open straight at.
export type VendorPageSection = 'proAlbum' | 'sneakPeek' | 'prints';
export const VENDOR_PAGE_SECTIONS: readonly VendorPageSection[] = ['proAlbum', 'sneakPeek', 'prints'];

export function isVendorPageSection(value: string | null | undefined): value is VendorPageSection {
    return VENDOR_PAGE_SECTIONS.includes(value as VendorPageSection);
}

export type VendorActionKey = VendorToolKey | VendorPageSection;

// The vendor's quick actions on the feed: the photo work that lives on the vendor page, then the tool links.
// Mirrors the vendor page's own gates, so an action never opens a section the page hides.
export function vendorQuickActions(
    eventId: string,
    me: VendorMeDto,
    readableModules: ReadonlySet<string>,
    eventStartAt: string | null | undefined,
    now: Date = new Date(),
): { key: VendorActionKey; href: string }[] {
    const proAlbumOn = capabilitiesOfType(me.vendorType).includes('PRO_ALBUM') && readableModules.has('vendors') && readableModules.has('gallery');
    const peek = me.sneakPeek;
    const started = !eventStartAt || now >= new Date(eventStartAt);
    const sections: { key: VendorPageSection; open: boolean }[] = [
        { key: 'proAlbum', open: proAlbumOn && hasVendorCapability(me, 'PRO_ALBUM') },
        // Only while one can be posted: from the event's start, and not once it's posted or used.
        {
            key: 'sneakPeek',
            open:
                proAlbumOn &&
                readableModules.has('posts') &&
                hasVendorCapability(me, 'SNEAK_PEEK') &&
                Boolean(peek && !peek.postId && !peek.used) &&
                started,
        },
        { key: 'prints', open: hasVendorCapability(me, 'PRINT_PICKS') },
    ];

    return [
        ...sections
            .filter((section) => section.open)
            .map((section) => ({ key: section.key, href: routes.events.tools.vendorMe(eventId, { section: section.key }) })),
        ...vendorToolLinks(eventId, me, readableModules),
    ];
}

export type PartnerBenefitKey = 'discount' | 'feedCard' | 'reach' | 'printPrices';
export type ComingPartnerBenefitKey = 'inquiries' | 'printKit' | 'eventPacks';

// What partners get today, for the vendor page's partner block. Print prices only mean something to photographers.
export function partnerBenefits(type: PartnerRole): PartnerBenefitKey[] {
    const benefits: PartnerBenefitKey[] = ['discount', 'feedCard', 'reach'];
    return capabilitiesOfType(type).includes('PRINT_PICKS') ? [...benefits, 'printPrices'] : benefits;
}

// Partner features still being built (Jira KAN-20, KAN-22, KAN-21). Move one to partnerBenefits when it ships.
export const COMING_PARTNER_BENEFITS: readonly ComingPartnerBenefitKey[] = ['inquiries', 'printKit', 'eventPacks'];

// Made-up print sizes, shown blurred behind the locked Print prices. Never readable, never real data.
export const SAMPLE_PRINT_SIZES: readonly { label: string; priceCents: number }[] = [
    { label: '10x15', priceCents: 120 },
    { label: '13x18', priceCents: 250 },
    { label: '20x30', priceCents: 600 },
];

// How many of the vendor's own photos the vendor page header shows.
export const VENDOR_HERO_PHOTOS_MAX = 5;

// The vendor types this event's plan allows: its vendors module's allowedTypes, in VENDOR_TYPES order.
// A missing key reads as none (the backend never treats it as "all"); no modules loaded yet reads as none too.
export function allowedVendorTypes(modules: readonly Pick<EventModuleResponseDto, 'moduleKey' | 'configuration'>[] | undefined): PartnerRole[] {
    const allowed = modules?.find((module) => module.moduleKey === 'vendors')?.configuration?.allowedTypes;
    if (!Array.isArray(allowed)) return [];
    return VENDOR_TYPES.filter((type) => allowed.includes(type));
}

// The types drawn in the Vendors empty-state picture, left to right. OTHER has no figure.
export type VendorSceneType = Exclude<PartnerRole, 'OTHER'>;
export const VENDOR_SCENE_TYPES: readonly VendorSceneType[] = ['PHOTOGRAPHER', 'VIDEOGRAPHER', 'VENUE', 'DECORATION', 'PLANNER', 'CATERING', 'MUSIC'];

// Where each type's marker sits on the picture, in the scene's viewBox units.
export const VENDOR_SCENE_MARKERS: Record<VendorSceneType, { x: number; y: number }> = {
    PHOTOGRAPHER: { x: 80, y: 72 },
    VIDEOGRAPHER: { x: 160, y: 74 },
    VENUE: { x: 330, y: 62 },
    DECORATION: { x: 282, y: 142 },
    PLANNER: { x: 450, y: 72 },
    CATERING: { x: 516, y: 106 },
    MUSIC: { x: 600, y: 74 },
};

// The picture's crop, in its own units.
export const VENDOR_SCENE_VIEWBOX = { x: 0, y: 30, width: 640, height: 200 };

// A type's marker centre as a percentage of the cropped picture, for placing it over the drawing.
export function vendorSceneMarkerPosition(type: VendorSceneType): { left: number; top: number } {
    const { x, y } = VENDOR_SCENE_MARKERS[type];
    return {
        left: ((x - VENDOR_SCENE_VIEWBOX.x) * 100) / VENDOR_SCENE_VIEWBOX.width,
        top: ((y - VENDOR_SCENE_VIEWBOX.y) * 100) / VENDOR_SCENE_VIEWBOX.height,
    };
}

// The text with its first letter in upper case ("other vendors" → "Other vendors"). Plain toUpperCase keeps
// the Greek accent (ά → Ά); the Greek locale's upper case drops it.
export function capitalizeFirst(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// The order of the "What vendors can do" rows: the picture's order, then OTHER.
const VENDOR_CAPABILITY_ORDER: readonly PartnerRole[] = [...VENDOR_SCENE_TYPES, 'OTHER'];

// The allowed types as "What vendors can do" rows, one each.
export function vendorCapabilityTypes(allowed: readonly PartnerRole[]): PartnerRole[] {
    return VENDOR_CAPABILITY_ORDER.filter((type) => allowed.includes(type));
}

// The allowed types the empty-state picture draws, left to right.
export function vendorSceneTypes(allowed: readonly PartnerRole[]): VendorSceneType[] {
    return VENDOR_SCENE_TYPES.filter((type) => allowed.includes(type));
}
