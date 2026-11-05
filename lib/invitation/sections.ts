import { z } from 'zod';

import { elementSchema } from '@/lib/invitation/elements';
import {
    colorSchema,
    fontSchema,
    idSchema,
    imageRefSchema,
    linkSchema,
    shortTextSchema,
    textSchema,
    textStyleSchema,
} from '@/lib/invitation/primitives';
import { sectionStyleSchema } from '@/lib/invitation/sectionStyle';

// One schema per section type. Every section stores its own fields in `data`;
// the style of a text field lives in `textStyles` under the field's path
// (`title`, `partnerA.name`, `items.<itemId>.label`).

const text = textSchema;
const size = z.number().min(6).max(400);
const borderWidth = z.number().min(0).max(40);

const decorationSchema = z
    .object({ image: imageRefSchema, width: z.number().min(20).max(2000) })
    .strict();

const namedPhotoSchema = z
    .object({ id: idSchema, name: text, photo: imageRefSchema.optional() })
    .strict();

const parentSchema = z
    .object({ label: text, name: text, photo: imageRefSchema.optional() })
    .strict();

const contactLinksSchema = {
    phone: shortTextSchema,
    sms: shortTextSchema,
    email: shortTextSchema,
    facebook: linkSchema,
    instagram: linkSchema,
    tiktok: linkSchema,
};

const partnerContactSchema = z.object({ name: text, ...contactLinksSchema }).strict();

const iconStyleSchema = z.object({ font: fontSchema.optional(), color: colorSchema.optional() }).strict();

const partnerProfileSchema = z
    .object({ name: text, role: text, familyLabel: text, familyNames: text })
    .strict();

const programStyleSchema = z
    .object({
        font: fontSchema.optional(),
        size: size.optional(),
        color: colorSchema.optional(),
        timeFont: fontSchema.optional(),
        timeSize: size.optional(),
        timeColor: colorSchema.optional(),
        labelFont: fontSchema.optional(),
        labelSize: size.optional(),
        labelColor: colorSchema.optional(),
        descriptionSize: size.optional(),
        iconColor: colorSchema.optional(),
        nodeColor: colorSchema.optional(),
        lineWidth: borderWidth.optional(),
    })
    .strict();

export const PROGRAM_ICONS = [
    'baptism', 'balloon', 'cake', 'champagne', 'church', 'cocktail', 'confetti', 'cross', 'cupcake',
    'dance', 'dinner', 'disco', 'dove', 'flowers', 'gift', 'heart', 'music', 'rings', 'stars',
] as const;

const programIconSchema = z.discriminatedUnion('kind', [
    // "auto" picks an icon from the row's label.
    z.object({ kind: z.literal('auto') }).strict(),
    z.object({ kind: z.literal('none') }).strict(),
    z.object({ kind: z.literal('preset'), key: z.enum(PROGRAM_ICONS) }).strict(),
    z
        .object({ kind: z.literal('custom'), image: imageRefSchema, mode: z.enum(['image', 'mask']), name: shortTextSchema })
        .strict(),
]);

export const DATE_DISPLAY_STYLES = [
    'original', 'stacked', 'editorial', 'vertical', 'bullet', 'split', 'triple', 'calendar',
] as const;

export const GALLERY_LAYOUTS = ['grid', 'masonry', 'carousel', 'featured'] as const;

export const GALLERY_SHAPES = ['round', 'square', 'rectangle', 'roundedSquare'] as const;

const columns = z.number().int().min(1).max(3);

export const SECTION_DATA_SCHEMAS = {
    top: z.object({}).strict(),
    baby: z
        .object({ babyName: text, babyPhoto: imageRefSchema.optional(), babyMessage: text })
        .strict(),
    parentsPhoto: z
        .object({ parentsTitle: text, parentA: parentSchema, parentB: parentSchema })
        .strict(),
    godparents: z
        .object({ godparentsTitle: text, godparents: z.array(namedPhotoSchema).max(20) })
        .strict(),
    parentsSimple: z
        .object({
            parentsTitle: text,
            parentAName: text,
            parentBName: text,
            godparentsTitle: text,
            godparents: z.array(z.object({ id: idSchema, name: text }).strict()).max(20),
            decoration: decorationSchema.optional(),
        })
        .strict(),
    invitation: z.object({ text }).strict(),
    date: z
        .object({
            iso: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
            displayStyle: z.enum(DATE_DISPLAY_STYLES),
            displayLanguage: z.enum(['el', 'en']),
            day: text,
            number: text,
            month: text,
            monthName: text,
            monthGenitive: text.optional(),
            monthNumber: text,
            time: text,
            yearLabel: text,
            yearShort: text,
            periodLabel: text.optional(),
        })
        .strict(),
    countdown: z
        .object({
            // The line above the numbers ("Ραντεβού σε...").
            label: text,
            numberStyle: z
                .object({ font: fontSchema.optional(), size: size.optional(), color: colorSchema.optional() })
                .strict()
                .optional(),
        })
        .strict(),
    locations: z
        .object({
            ceremony: text,
            ceremonyAddress: text,
            ceremonyMap: linkSchema,
            welcomeEnabled: z.boolean(),
            welcome: text,
            welcomeAddress: text,
            welcomeMap: linkSchema,
            note: text,
            reception: text,
            receptionAddress: text,
            receptionMap: linkSchema,
            desktopColumns: columns,
        })
        .strict(),
    parents: z.object({ parents: text, godparents: text }).strict(),
    rsvp: z
        .object({
            title: text,
            deadline: text,
            formStyle: z
                .object({
                    labelFont: fontSchema.optional(),
                    labelSize: size.optional(),
                    labelColor: colorSchema.optional(),
                    fieldBorderColor: colorSchema.optional(),
                    fieldBorderWidth: borderWidth.optional(),
                    fieldFillColor: colorSchema.optional(),
                    fieldRadius: z.number().min(0).max(100).optional(),
                    optionSelectedColor: colorSchema.optional(),
                    buttonBg: colorSchema.optional(),
                    buttonColor: colorSchema.optional(),
                    buttonFont: fontSchema.optional(),
                })
                .strict()
                .optional(),
        })
        .strict(),
    gift: z.object({ title: text, bank: text, iban: text }).strict(),
    accommodation: z
        .object({
            title: text,
            subtitle: text,
            items: z
                .array(
                    z
                        .object({
                            id: idSchema,
                            name: text,
                            address: text,
                            phone: shortTextSchema,
                            email: shortTextSchema,
                            website: linkSchema,
                            mapUrl: linkSchema,
                        })
                        .strict(),
                )
                .max(30),
            cardStyle: z
                .object({
                    borderWidth: borderWidth.optional(),
                    borderColor: colorSchema.optional(),
                    fillColor: colorSchema.optional(),
                })
                .strict()
                .optional(),
        })
        .strict(),
    program: z
        .object({
            title: text,
            items: z.array(z.object({ id: idSchema, time: shortTextSchema, label: text }).strict()).max(50),
            programStyle: programStyleSchema.optional(),
        })
        .strict(),
    programIcons: z
        .object({
            title: text,
            subtitle: text,
            items: z
                .array(
                    z
                        .object({ id: idSchema, time: shortTextSchema, label: text, description: text, icon: programIconSchema })
                        .strict(),
                )
                .max(50),
            programStyle: programStyleSchema.optional(),
        })
        .strict(),
    contact: z
        .object({ title: text, ...contactLinksSchema, iconStyle: iconStyleSchema.optional() })
        .strict(),
    gallery: z
        .object({
            title: text,
            images: z.array(imageRefSchema).max(10),
            layout: z.enum(GALLERY_LAYOUTS),
            shape: z.enum(GALLERY_SHAPES),
        })
        .strict(),
    faq: z
        .object({
            title: text,
            items: z.array(z.object({ id: idSchema, question: text, answer: text }).strict()).max(50),
            faqStyle: z
                .object({
                    questionFont: fontSchema.optional(),
                    questionSize: size.optional(),
                    questionColor: colorSchema.optional(),
                    answerFont: fontSchema.optional(),
                    answerSize: size.optional(),
                    answerColor: colorSchema.optional(),
                    borderWidth: borderWidth.optional(),
                    borderColor: colorSchema.optional(),
                    fillColor: colorSchema.optional(),
                })
                .strict()
                .optional(),
        })
        .strict(),
    blank: z.object({}).strict(),
    photo: z
        .object({ photo: imageRefSchema.optional(), imageY: z.number().min(0).max(100) })
        .strict(),
    coupleNames: z.object({ partnerAName: text, partnerBName: text }).strict(),
    ourStoryProposal: z
        .object({
            block1Title: text,
            block1Subtitle: text,
            block1Body: text,
            block2Title: text,
            block2Subtitle: text,
            block2Body: text,
        })
        .strict(),
    dressCode: z.object({ title: text, note: text, colors: z.array(colorSchema).max(12) }).strict(),
    coupleContact: z
        .object({
            title: text,
            partnerA: partnerContactSchema,
            partnerB: partnerContactSchema,
            iconStyle: iconStyleSchema.optional(),
        })
        .strict(),
    weddingSponsors: z
        .object({ sponsorsTitle: text, sponsors: z.array(namedPhotoSchema).max(20) })
        .strict(),
    coupleProfiles: z
        .object({
            partnerA: partnerProfileSchema.extend({ photo: imageRefSchema.optional() }).strict(),
            partnerB: partnerProfileSchema.extend({ photo: imageRefSchema.optional() }).strict(),
            desktopColumns: columns,
        })
        .strict(),
    coupleProfilesSimple: z
        .object({
            partnerA: partnerProfileSchema,
            partnerB: partnerProfileSchema,
            desktopColumns: columns,
            decoration: decorationSchema.optional(),
        })
        .strict(),
    weddingSponsorsSimple: z
        .object({ sponsorsTitle: text, sponsorsNames: text, decoration: decorationSchema.optional() })
        .strict(),
    // Like a custom section: its frames are photoFrame elements. It starts with one.
    photoFrame: z.object({}).strict(),
    footer: z
        .object({ text, textColor: colorSchema.optional(), font: fontSchema.optional(), link: linkSchema })
        .strict(),
} as const;

export type SectionType = keyof typeof SECTION_DATA_SCHEMAS;

export const SECTION_TYPES = Object.keys(SECTION_DATA_SCHEMAS) as SectionType[];

// Sections that may appear more than once in one invitation.
export const MULTI_INSTANCE_SECTION_TYPES: ReadonlySet<SectionType> = new Set(['blank', 'photo', 'photoFrame']);

function sectionSchemaFor<T extends SectionType>(type: T) {
    return z
        .object({
            id: idSchema,
            type: z.literal(type),
            name: shortTextSchema,
            visible: z.boolean(),
            locked: z.boolean(),
            data: SECTION_DATA_SCHEMAS[type],
            textStyles: z.record(z.string().max(200), textStyleSchema),
            elements: z.array(elementSchema).max(100),
            style: sectionStyleSchema,
        })
        .strict();
}

const sectionUnion = z.discriminatedUnion(
    'type',
    SECTION_TYPES.map((type) => sectionSchemaFor(type)) as unknown as [
        ReturnType<typeof sectionSchemaFor<SectionType>>,
        ...ReturnType<typeof sectionSchemaFor<SectionType>>[],
    ],
);

export type InvitationSection = {
    [T in SectionType]: z.infer<ReturnType<typeof sectionSchemaFor<T>>>;
}[SectionType];

export const sectionSchema = sectionUnion.superRefine((section, ctx) => {
    for (const path of Object.keys(section.textStyles)) {
        if (typeof resolveTextField(section.data, path) !== 'string') {
            ctx.addIssue({ code: 'custom', path: ['textStyles', path], message: 'Style for a field that does not exist' });
        }
    }
    const breaks = section.elements.filter((element) => element.kind === 'columnBreak').length;
    const fullWidth = section.elements.some((element) => element.kind === 'text' && element.fullWidth);
    if (section.type !== 'blank' && (breaks > 0 || fullWidth)) {
        ctx.addIssue({ code: 'custom', path: ['elements'], message: 'Columns are only allowed in custom sections' });
    }
    if (breaks > 1) {
        ctx.addIssue({ code: 'custom', path: ['elements'], message: 'Only one column break per section' });
    }
}) as unknown as z.ZodType<InvitationSection>;

// Finds the value a text style path points at. A list segment matches the
// id of an item in that list, so styles follow items when they move.
export function resolveTextField(data: unknown, path: string): unknown {
    let current: unknown = data;
    for (const segment of path.split('.')) {
        if (Array.isArray(current)) {
            current = current.find((item) => isRecord(item) && item.id === segment);
        } else if (isRecord(current) && Object.hasOwn(current, segment)) {
            current = current[segment];
        } else {
            return undefined;
        }
    }
    return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
