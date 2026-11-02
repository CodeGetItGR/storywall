import { z } from 'zod';

import { colorSchema, idSchema, type ImageRef } from '@/lib/invitation/primitives';
import { type InvitationSection,MULTI_INSTANCE_SECTION_TYPES, sectionSchema } from '@/lib/invitation/sections';
import { type ThemeDesign,themeDesignSchema } from '@/lib/invitation/theme';

export const INVITATION_SCHEMA_VERSION = 1;

export const invitationDocumentSchema = z
    .object({
        schemaVersion: z.literal(INVITATION_SCHEMA_VERSION),
        themeId: idSchema,
        // The only parts of the theme a host may change.
        overrides: z
            .object({ typographyPresetId: idSchema.optional(), textColor: colorSchema.optional() })
            .strict(),
        sections: z.array(sectionSchema).max(150),
    })
    .strict()
    .superRefine((document, ctx) => {
        const sectionIds = new Set<string>();
        const elementIds = new Set<string>();
        const singleTypes = new Set<string>();
        document.sections.forEach((section, index) => {
            if (sectionIds.has(section.id)) {
                ctx.addIssue({ code: 'custom', path: ['sections', index, 'id'], message: 'Duplicate section id' });
            }
            sectionIds.add(section.id);
            if (!MULTI_INSTANCE_SECTION_TYPES.has(section.type)) {
                if (singleTypes.has(section.type)) {
                    ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'Section type used twice' });
                }
                singleTypes.add(section.type);
            }
            for (const element of section.elements) {
                if (elementIds.has(element.id)) {
                    ctx.addIssue({ code: 'custom', path: ['sections', index, 'elements'], message: 'Duplicate element id' });
                }
                elementIds.add(element.id);
            }
            const isLast = index === document.sections.length - 1;
            if (section.type === 'footer' && (!isLast || !section.locked)) {
                ctx.addIssue({ code: 'custom', path: ['sections', index], message: 'The footer is locked and last' });
            }
        });
    });

export type InvitationDocument = z.infer<typeof invitationDocumentSchema>;

// What guests see. Publishing freezes the theme as it was at that moment, so
// later theme edits never change a live invitation.
export const publishedInvitationSchema = z
    .object({
        document: invitationDocumentSchema,
        theme: themeDesignSchema,
        themeRevision: z.number().int().min(0),
        publishedAt: z.iso.datetime(),
    })
    .strict();

export type PublishedInvitation = z.infer<typeof publishedInvitationSchema>;

// Upgrades run in order from a stored document's version to the current one.
// Each entry turns version N into N + 1 and has its own test.
type Upgrade = (document: Record<string, unknown>) => Record<string, unknown>;
export const INVITATION_UPGRADES: Record<number, Upgrade> = {};

export function upgradeInvitationDocument(raw: unknown): InvitationDocument {
    let document = z.object({ schemaVersion: z.number().int().min(1) }).loose().parse(raw) as Record<string, unknown>;
    for (let version = document.schemaVersion as number; version < INVITATION_SCHEMA_VERSION; version += 1) {
        const upgrade = INVITATION_UPGRADES[version];
        if (!upgrade) throw new Error(`No upgrade from invitation schema ${version}`);
        document = { ...upgrade(document), schemaVersion: version + 1 };
    }
    return invitationDocumentSchema.parse(document);
}

// Theme assets an invitation points at must exist in the theme it uses.
export function findMissingThemeAssets(document: InvitationDocument, theme: ThemeDesign): string[] {
    const known = new Set([...theme.elements, ...theme.frames, ...theme.transitions].map((asset) => asset.id));
    const used = document.sections.flatMap(themeAssetIdsInSection);
    return [...new Set(used.filter((id) => !known.has(id)))];
}

function themeAssetIdsInSection(section: InvitationSection): string[] {
    const ids: string[] = [];
    if (section.style.transition) ids.push(section.style.transition.assetId);
    collectThemeImages(section.data, ids);
    collectThemeImages(section.style.background, ids);
    for (const element of section.elements) {
        if (element.kind === 'photoFrame' && element.frameId) ids.push(element.frameId);
        collectThemeImages(element, ids);
    }
    return ids;
}

function collectThemeImages(value: unknown, ids: string[]) {
    if (Array.isArray(value)) {
        value.forEach((item) => collectThemeImages(item, ids));
    } else if (typeof value === 'object' && value !== null) {
        const ref = value as Partial<ImageRef>;
        if (ref.source === 'theme' && typeof ref.assetId === 'string') ids.push(ref.assetId);
        Object.values(value).forEach((child) => collectThemeImages(child, ids));
    }
}
