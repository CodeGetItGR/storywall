import type { CollaboratorBrandingRequestDto, CollaboratorResponseDto, PartnerRole } from '@/lib/api/types';

export const PARTNER_ROLES: readonly PartnerRole[] = ['PLANNER', 'VENUE', 'PHOTOGRAPHER', 'VIDEOGRAPHER', 'DECORATION', 'CATERING', 'MUSIC', 'OTHER'];

export const BRANDING_NAME_MAX = 80;
export const BRANDING_LINE_MAX = 120;

function isPartnerRole(value: string): value is PartnerRole {
    return (PARTNER_ROLES as readonly string[]).includes(value);
}

function trimmedOrNull(value: FormDataEntryValue | null): string | null {
    const text = typeof value === 'string' ? value.trim() : '';
    return text === '' ? null : text;
}

/** The card text form as a full replacement: a blank field clears it. */
export function brandingRequestFromFormData(formData: FormData): CollaboratorBrandingRequestDto {
    const role = trimmedOrNull(formData.get('role'));
    return {
        displayName: trimmedOrNull(formData.get('displayName')),
        role: role && isPartnerRole(role) ? role : null,
        taglineEl: trimmedOrNull(formData.get('taglineEl')),
        taglineEn: trimmedOrNull(formData.get('taglineEn')),
        servicesEl: trimmedOrNull(formData.get('servicesEl')),
        servicesEn: trimmedOrNull(formData.get('servicesEn')),
    };
}

/** The saved card text, in the same shape the form produces. */
export function brandingRequestFromCollaborator(collaborator: CollaboratorResponseDto): CollaboratorBrandingRequestDto {
    return {
        displayName: collaborator.brandingDisplayName,
        role: collaborator.brandingRole,
        taglineEl: collaborator.brandingTaglineEl,
        taglineEn: collaborator.brandingTaglineEn,
        servicesEl: collaborator.brandingServicesEl,
        servicesEn: collaborator.brandingServicesEn,
    };
}

/** A report date input (YYYY-MM-DD) as the server's range bound: the whole day, in UTC. */
export function reportRangeBound(date: string, edge: 'from' | 'to'): string | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return edge === 'from' ? `${date}T00:00:00Z` : `${date}T23:59:59Z`;
}

/** The server's range bound as a date input value. */
export function reportDateInputValue(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : '';
}
