import type { SectionData, SettingsGroup } from '@/lib/invitation/sectionSettings';

// The style settings of each section, as the old panels laid them out: groups
// of font, size, colour and width fields over one style object. An empty
// field follows the theme. Labels are keys under InvitationEditor.

export type StyleFieldKind = 'font' | 'size' | 'color' | 'width';

export type StyleField = {
    key: string;
    kind: StyleFieldKind;
    label: string;
    // Hosts pick fonts from the toolbar's whole-site styles, so section fonts are the admin's.
    adminOnly?: boolean;
    // The number an empty size or width field shows greyed out.
    placeholder?: number;
    min?: number;
    max?: number;
    // The colour an empty colour field shows.
    fallback?: string;
};

export type StyleFieldGroup = { label?: string; fields: StyleField[] };

const SIZE = { kind: 'size', label: 'sectionSettings.size', min: 6, max: 400 } as const;
const WIDTH = { kind: 'width', label: 'sectionSettings.borderWidth', min: 0, max: 40 } as const;

const font = (key: string, label = 'font'): StyleField => ({ key, kind: 'font', label, adminOnly: true });
const size = (key: string, placeholder: number, label: string = SIZE.label): StyleField => ({ ...SIZE, key, placeholder, label });
const color = (key: string, fallback: string, label = 'sectionSettings.color'): StyleField => ({ key, kind: 'color', label, fallback });
const width = (key: string, placeholder: number, label: string = WIDTH.label, min: number = WIDTH.min, max: number = WIDTH.max): StyleField => ({
    ...WIDTH,
    key,
    placeholder,
    label,
    min,
    max,
});

export const COUNTDOWN_FIELDS: StyleFieldGroup[] = [
    { fields: [font('font'), size('size', 48, 'sectionSettings.numberSize'), color('color', '#777777')] },
];

export const FAQ_FIELDS: StyleFieldGroup[] = [
    { label: 'sectionSettings.question', fields: [font('questionFont'), size('questionSize', 16), color('questionColor', '#000000')] },
    { label: 'sectionSettings.answer', fields: [font('answerFont'), size('answerSize', 14), color('answerColor', '#000000')] },
    {
        label: 'sectionSettings.box',
        fields: [
            color('fillColor', '#ffffff', 'sectionSettings.fill'),
            color('borderColor', '#000000', 'sectionSettings.border'),
            width('borderWidth', 1),
        ],
    },
];

export const RSVP_FIELDS: StyleFieldGroup[] = [
    { label: 'sectionSettings.fieldLabels', fields: [font('labelFont'), size('labelSize', 13), color('labelColor', '#000000')] },
    {
        label: 'sectionSettings.fields',
        fields: [
            color('fieldFillColor', '#ffffff', 'sectionSettings.fill'),
            color('fieldBorderColor', '#000000', 'sectionSettings.border'),
            width('fieldBorderWidth', 1),
            width('fieldRadius', 10, 'sectionSettings.cornerRadius', 0, 100),
            color('optionSelectedColor', '#3a3a3e', 'sectionSettings.selectedColor'),
        ],
    },
    {
        label: 'sectionSettings.sendButton',
        fields: [font('buttonFont'), color('buttonBg', '#2f7a4f', 'sectionSettings.background'), color('buttonColor', '#ffffff', 'textColor')],
    },
];

const PROGRAM_TIME: StyleFieldGroup = {
    label: 'sectionSettings.time',
    fields: [font('timeFont'), size('timeSize', 26), color('timeColor', '#000000')],
};
const PROGRAM_TEXT: StyleFieldGroup = {
    label: 'sectionSettings.text',
    fields: [font('labelFont'), size('labelSize', 14), color('labelColor', '#000000')],
};
// The old line width ran from 1 to 8.
const PROGRAM_LINE: StyleFieldGroup = {
    label: 'sectionSettings.line',
    fields: [width('lineWidth', 1, 'sectionSettings.lineWidth', 1, 8), color('color', '#000000')],
};

export const PROGRAM_FIELDS: StyleFieldGroup[] = [PROGRAM_TIME, PROGRAM_TEXT, PROGRAM_LINE];

// A program with icons calls its text the title, as the old panel did.
export const PROGRAM_ICONS_FIELDS: StyleFieldGroup[] = [
    PROGRAM_TIME,
    { ...PROGRAM_TEXT, label: 'sectionSettings.title' },
    { label: 'sectionSettings.description', fields: [size('descriptionSize', 14)] },
    PROGRAM_LINE,
    {
        label: 'sectionSettings.icons',
        fields: [color('iconColor', '#000000', 'sectionSettings.iconColor'), color('nodeColor', '#ffffff', 'sectionSettings.circleFill')],
    },
];

export const STAY_BOX_FIELDS: StyleFieldGroup[] = [
    {
        fields: [
            width('borderWidth', 1),
            color('borderColor', '#000000', 'sectionSettings.border'),
            color('fillColor', '#ffffff', 'sectionSettings.fill'),
        ],
    },
];

export const CONTACT_STYLE_FIELDS: StyleFieldGroup[] = [
    { fields: [font('font', 'sectionSettings.titleFont'), color('color', '#777777', 'sectionSettings.iconTitleColor')] },
];

export const FOOTER_STYLE_FIELDS: StyleFieldGroup[] = [{ fields: [font('font'), color('textColor', '#777777', 'textColor')] }];

// The fields a mode sees.
export function visibleStyleGroups(groups: StyleFieldGroup[], isAdmin: boolean): StyleFieldGroup[] {
    return groups
        .map((group) => ({ ...group, fields: group.fields.filter((field) => isAdmin || !field.adminOnly) }))
        .filter((group) => group.fields.length > 0);
}

// A size or width as typed: empty clears it, anything else is kept within the field's range.
export function readStyleNumber(field: StyleField, raw: string): number | undefined {
    const trimmed = raw.trim();
    if (trimmed === '') return undefined;
    const value = Number(trimmed);
    if (!Number.isFinite(value)) return undefined;
    return Math.min(field.max ?? Infinity, Math.max(field.min ?? -Infinity, value));
}

type ProgramStyle = NonNullable<SectionData<'program'>['programStyle']>;

// The values the program panel shows. Older programs had one font, size and
// colour for both time and text; the panel shows them in both fields, as the old one did.
export function programStyleView(style: ProgramStyle | undefined): Record<string, unknown> {
    const view: Record<string, unknown> = { ...style };
    if (!style) return view;
    view.timeFont = style.timeFont ?? style.font;
    view.labelFont = style.labelFont ?? style.font;
    view.timeSize = style.timeSize ?? style.size;
    view.timeColor = style.timeColor ?? style.color;
    view.labelColor = style.labelColor ?? style.color;
    return view;
}

// The old panel saved the whole style at once, which turned the older shared
// font and size into the time and text ones. A change here does the same.
export function upgradeProgramStyle(style: ProgramStyle | undefined): ProgramStyle | undefined {
    if (!style) return style;
    const { font, size, ...rest } = style;
    const upgraded: ProgramStyle = { ...rest };
    if (font !== undefined || rest.timeFont !== undefined) upgraded.timeFont = rest.timeFont ?? font;
    if (font !== undefined || rest.labelFont !== undefined) upgraded.labelFont = rest.labelFont ?? font;
    if (size !== undefined || rest.timeSize !== undefined) upgraded.timeSize = rest.timeSize ?? size;
    if (rest.color !== undefined) {
        upgraded.timeColor = rest.timeColor ?? rest.color;
        upgraded.labelColor = rest.labelColor ?? rest.color;
    }
    return upgraded;
}

// The style field groups each style group of the sheet edits.
export type StyleSettingsGroup = Extract<SettingsGroup, 'countdown' | 'faq' | 'rsvp' | 'programStyle' | 'stayBox'>;
