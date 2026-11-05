import { convertFrameFields } from '@/lib/invitation/convert/elements';
import type { Reader } from '@/lib/invitation/convert/reader';
import { pick } from '@/lib/invitation/convert/theme';
import {
    clamp,
    cleanColor,
    cleanFont,
    cleanLink,
    type ConvertContext,
    definedOnly,
    imageRef,
    warn,
} from '@/lib/invitation/convert/values';
import type { InvitationElement } from '@/lib/invitation/elements';
import {
    DATE_DISPLAY_STYLES,
    GALLERY_LAYOUTS,
    GALLERY_SHAPES,
    PROGRAM_ICONS,
    type SectionType,
} from '@/lib/invitation/sections';

type Converted = {
    type: SectionType;
    data: Record<string, unknown>;
    // Old `_style` path prefixes and the new ones they became.
    styleRenames?: [string, string][];
    // An extra element to add (the old frame kept on a photoFrame section).
    extraElement?: InvitationElement;
};

type Ctx = { ctx: ConvertContext; sectionId: string };

// Each old section type's `data`, field by field. Every key read here counts
// as mapped; `drop` marks the ones left out on purpose.
export function convertSectionData(type: string, d: Reader, { ctx, sectionId }: Ctx, hasFrameElement: boolean): Converted {
    const text = (key: string) => d.str(key);
    const link = (key: string, value = d.str(key)) => cleanLink(value, ctx, `${d.path}.${key}`);
    const photo = (key: string, from: Reader = d) => imageRef(from.str(key), ctx);
    const columns = (key: string) => clamp(Math.round(d.num(key) ?? 2), 1, 3);
    const decoration = () => {
        const image = imageRef(d.str('element1'), ctx);
        const width = clamp(d.num('element1Width'), 20, 2000) ?? 260;
        return image ? { image, width } : undefined;
    };
    const named = (list: Reader[], prefix: string, withPhoto: boolean) =>
        list.map((item, index) => ({
            id: item.str('id') || `${sectionId}-${prefix}${index}`,
            name: item.str('name'),
            ...(withPhoto ? { photo: photo('photo', item) } : (item.drop('photo'), {})),
        }));
    const contacts = (from: Reader) => ({
        phone: from.str('phone'),
        sms: from.str('sms'),
        email: from.str('email'),
        facebook: cleanLink(from.str('facebook'), ctx, `${from.path}.facebook`),
        instagram: cleanLink(from.str('instagram'), ctx, `${from.path}.instagram`),
        tiktok: cleanLink(from.str('tiktok'), ctx, `${from.path}.tiktok`),
    });
    const iconStyle = () => {
        const style = d.obj('iconStyle');
        return definedOnly({ font: cleanFont(style.str('font')), color: cleanColor(style.str('color')) });
    };
    const programStyle = () => {
        const style = d.obj('programStyle');
        return definedOnly({
            font: cleanFont(style.str('font')),
            size: clamp(style.num('size'), 6, 400),
            color: cleanColor(style.str('color')),
            timeFont: cleanFont(style.str('timeFont')),
            timeSize: clamp(style.num('timeSize'), 6, 400),
            timeColor: cleanColor(style.str('timeColor')),
            labelFont: cleanFont(style.str('labelFont')),
            labelSize: clamp(style.num('labelSize'), 6, 400),
            labelColor: cleanColor(style.str('labelColor')),
            descriptionSize: clamp(style.num('descriptionSize'), 6, 400),
            iconColor: cleanColor(style.str('iconColor')),
            nodeColor: cleanColor(style.str('nodeColor')),
            lineWidth: clamp(style.num('lineWidth'), 0, 40),
        });
    };
    const profile = (from: Reader, withPhoto: boolean) => ({
        name: from.str('name'),
        role: from.str('role'),
        familyLabel: from.str('familyLabel'),
        familyNames: from.str('familyNames'),
        ...(withPhoto ? { photo: photo('photo', from) } : (from.drop('photo'), {})),
    });

    switch (type) {
        case 'top':
        case 'blank':
            return { type, data: {} };
        // The old app never drew this section: it showed as an empty band, so
        // it becomes an empty custom section the host can fill.
        case 'actionButton':
            d.drop('url', 'title', 'buttonText');
            return { type: 'blank', data: {} };
        case 'baby':
            return { type, data: { babyName: text('babyName'), babyPhoto: photo('babyPhoto'), babyMessage: text('babyMessage') } };
        case 'parentsPhoto': {
            const parent = (from: Reader) => ({ label: from.str('label'), name: from.str('name'), photo: photo('photo', from) });
            return {
                type,
                data: { parentsTitle: text('parentsTitle'), parentA: parent(d.obj('dad')), parentB: parent(d.obj('mom')) },
                styleRenames: [['dad.', 'parentA.'], ['mom.', 'parentB.']],
            };
        }
        case 'godparents':
            return { type, data: { godparentsTitle: text('godparentsTitle'), godparents: named(d.list('godparents'), 'g', true) } };
        case 'parentsSimple':
            return {
                type,
                data: {
                    parentsTitle: text('parentsTitle'),
                    parentAName: text('dadName'),
                    parentBName: text('momName'),
                    godparentsTitle: text('godparentsTitle'),
                    godparents: named(d.list('godparents'), 'g', false),
                    decoration: decoration(),
                },
                styleRenames: [['dadName', 'parentAName'], ['momName', 'parentBName']],
            };
        case 'invitation':
            return { type, data: { text: text('text') } };
        case 'date': {
            const iso = text('iso');
            if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) warn(ctx, `${d.path}.iso`, `not a date and time (${iso})`);
            return {
                type,
                data: {
                    iso,
                    displayStyle: pick(text('displayStyle'), DATE_DISPLAY_STYLES, 'original', ctx, `${d.path}.displayStyle`),
                    displayLanguage: text('displayLanguage') === 'en' ? 'en' : 'el',
                    day: text('day'),
                    number: text('number'),
                    month: text('month'),
                    monthName: text('monthName'),
                    monthGenitive: d.has('monthGenitive') ? text('monthGenitive') : (d.raw('monthGenitive'), undefined),
                    monthNumber: text('monthNumber'),
                    time: text('time'),
                    yearLabel: text('yearLabel'),
                    yearShort: text('yearShort'),
                    periodLabel: d.has('periodLabel') ? text('periodLabel') : (d.raw('periodLabel'), undefined),
                },
            };
        }
        case 'countdown': {
            const style = d.obj('numStyle');
            return {
                type,
                data: {
                    label: d.str('label') || 'Ραντεβού σε...',
                    numberStyle: definedOnly({
                        font: cleanFont(style.str('font')),
                        size: clamp(style.num('size'), 6, 400),
                        color: cleanColor(style.str('color')),
                    }),
                },
            };
        }
        case 'locations':
            return {
                type,
                data: {
                    ceremony: text('church'),
                    ceremonyAddress: text('churchAddress'),
                    // churchMapUrl was an older name for the same link.
                    ceremonyMap: link('churchMap', d.str('churchMap') || d.str('churchMapUrl')),
                    welcomeEnabled: d.bool('welcomeEnabled') === true,
                    welcome: text('welcome'),
                    welcomeAddress: text('welcomeAddress'),
                    welcomeMap: link('welcomeMap'),
                    note: text('note'),
                    reception: text('reception'),
                    receptionAddress: text('receptionAddress'),
                    receptionMap: link('receptionMap', d.str('receptionMap') || d.str('receptionMapUrl')),
                    desktopColumns: columns('desktopColumns'),
                },
                styleRenames: [['churchAddress', 'ceremonyAddress'], ['church', 'ceremony']],
            };
        case 'parents':
            return { type, data: { parents: text('parents'), godparents: text('godparents') } };
        case 'rsvp': {
            const style = d.obj('rsvpStyle');
            return {
                type,
                data: {
                    title: text('title'),
                    deadline: text('deadline'),
                    formStyle: definedOnly({
                        labelFont: cleanFont(style.str('labelFont')),
                        labelSize: clamp(style.num('labelSize'), 6, 400),
                        labelColor: cleanColor(style.str('labelColor')),
                        fieldBorderColor: cleanColor(style.str('fieldBorderColor')),
                        fieldBorderWidth: clamp(style.num('fieldBorderWidth'), 0, 40),
                        fieldFillColor: cleanColor(style.str('fieldFillColor')),
                        fieldRadius: clamp(style.num('fieldRadius'), 0, 100),
                        optionSelectedColor: cleanColor(style.str('optionSelectedColor')),
                        buttonBg: cleanColor(style.str('btnBg')),
                        buttonColor: cleanColor(style.str('btnColor')),
                        buttonFont: cleanFont(style.str('btnFont')),
                    }),
                },
            };
        }
        case 'gift':
            return { type, data: { title: text('title'), bank: text('bank'), iban: text('iban') } };
        case 'accommodation': {
            const style = d.obj('stayStyle');
            return {
                type,
                data: {
                    title: text('title'),
                    subtitle: text('subtitle'),
                    items: d.list('items').map((item, index) => ({
                        id: item.str('id') || `${sectionId}-stay${index}`,
                        name: item.str('name'),
                        address: item.str('address'),
                        phone: item.str('phone'),
                        email: item.str('email'),
                        website: cleanLink(item.str('website'), ctx, `${item.path}.website`),
                        mapUrl: cleanLink(item.str('mapUrl'), ctx, `${item.path}.mapUrl`),
                    })),
                    cardStyle: definedOnly({
                        borderWidth: clamp(style.num('borderWidth'), 0, 40),
                        borderColor: cleanColor(style.str('borderColor')),
                        fillColor: cleanColor(style.str('fillColor')),
                    }),
                },
            };
        }
        case 'program':
            return {
                type,
                data: {
                    title: text('title'),
                    items: d.list('items').map((item, index) => ({
                        id: item.str('id') || `${sectionId}-p${index}`,
                        time: item.str('time'),
                        label: item.str('label'),
                    })),
                    programStyle: programStyle(),
                },
            };
        case 'programIcons':
            return {
                type,
                data: {
                    title: text('title'),
                    subtitle: text('subtitle'),
                    items: d.list('items').map((item, index) => ({
                        id: item.str('id') || `${sectionId}-p${index}`,
                        time: item.str('time'),
                        label: item.str('label'),
                        description: item.str('description'),
                        icon: programIcon(item, ctx),
                    })),
                    programStyle: programStyle(),
                },
            };
        case 'contact':
            // phone1 and phone2 come from an early default; nothing showed them.
            d.drop('phone1', 'phone2');
            return { type, data: { title: text('title'), ...contacts(d), iconStyle: iconStyle() } };
        case 'gallery': {
            // `active` was the carousel's current slide; image names were file names.
            d.drop('active');
            const images = d.list('images').flatMap((image) => {
                image.drop('id', 'name');
                const ref = imageRef(image.str('src'), ctx);
                return ref ? [ref] : [];
            });
            if (images.length > 10) warn(ctx, d.path, `kept the first 10 of ${images.length} photos`);
            return {
                type,
                data: {
                    title: text('title'),
                    images: images.slice(0, 10),
                    layout: pick(text('layout'), GALLERY_LAYOUTS, 'grid', ctx, `${d.path}.layout`),
                    shape: pick(text('shape'), GALLERY_SHAPES, 'square', ctx, `${d.path}.shape`),
                },
            };
        }
        case 'faq': {
            const style = d.obj('faqStyle');
            return {
                type,
                data: {
                    title: text('title'),
                    items: d.list('items').map((item, index) => {
                        // `open` was whether the answer was expanded in the editor.
                        item.drop('open');
                        return { id: item.str('id') || `${sectionId}-q${index}`, question: item.str('q'), answer: item.str('a') };
                    }),
                    faqStyle: definedOnly({
                        questionFont: cleanFont(style.str('qFont')),
                        questionSize: clamp(style.num('qSize'), 6, 400),
                        questionColor: cleanColor(style.str('qColor')),
                        answerFont: cleanFont(style.str('aFont')),
                        answerSize: clamp(style.num('aSize'), 6, 400),
                        answerColor: cleanColor(style.str('aColor')),
                        borderWidth: clamp(style.num('borderWidth'), 0, 40),
                        borderColor: cleanColor(style.str('borderColor')),
                        fillColor: cleanColor(style.str('fillColor')),
                    }),
                },
            };
        }
        case 'photo':
            return { type, data: { photo: photo('src'), imageY: clamp(d.num('imageY'), 0, 100) ?? 50 } };
        case 'coupleNames':
            return {
                type,
                data: { partnerAName: text('name1'), partnerBName: text('name2') },
                styleRenames: [['name1', 'partnerAName'], ['name2', 'partnerBName']],
            };
        case 'ourStoryProposal':
            return {
                type,
                data: Object.fromEntries(
                    ['block1Title', 'block1Subtitle', 'block1Body', 'block2Title', 'block2Subtitle', 'block2Body'].map((key) => [key, text(key)]),
                ),
            };
        case 'dressCode':
            // `code` (e.g. "Formal") was never shown on the page.
            d.drop('code');
            return {
                type,
                data: {
                    title: text('title'),
                    note: text('note'),
                    colors: d.strings('colors').map((color) => cleanColor(color)).filter(Boolean).slice(0, 12),
                },
            };
        case 'coupleContact':
            return {
                type,
                data: {
                    title: text('title'),
                    partnerA: { name: d.obj('bride').str('name'), ...contacts(d.obj('bride')) },
                    partnerB: { name: d.obj('groom').str('name'), ...contacts(d.obj('groom')) },
                    iconStyle: iconStyle(),
                },
                styleRenames: [['bride.', 'partnerA.'], ['groom.', 'partnerB.']],
            };
        case 'weddingSponsors':
            return { type, data: { sponsorsTitle: text('sponsorsTitle'), sponsors: named(d.list('sponsors'), 's', true) } };
        case 'coupleProfiles':
            return {
                type,
                data: { partnerA: profile(d.obj('groom'), true), partnerB: profile(d.obj('bride'), true), desktopColumns: columns('desktopColumns') },
                styleRenames: [['groom.', 'partnerA.'], ['bride.', 'partnerB.']],
            };
        case 'coupleProfilesSimple':
            return {
                type,
                data: {
                    partnerA: profile(d.obj('groom'), false),
                    partnerB: profile(d.obj('bride'), false),
                    desktopColumns: columns('desktopColumns'),
                    decoration: decoration(),
                },
                styleRenames: [['groom.', 'partnerA.'], ['bride.', 'partnerB.']],
            };
        case 'weddingSponsorsSimple': {
            // Older sections kept two names apart; the old editor joined them.
            const joined = [d.str('sponsor1Name'), d.str('sponsor2Name')].filter((name) => name.trim()).join('\n');
            return {
                type,
                data: {
                    sponsorsTitle: text('sponsorsTitle'),
                    sponsorsNames: d.has('sponsorsNames') ? text('sponsorsNames') : joined,
                    decoration: decoration(),
                },
                styleRenames: [['sponsor1Name', 'sponsorsNames']],
            };
        }
        case 'photoFrame': {
            // The section's own frame fields predate frame elements; they
            // only matter when the section has no frame element yet.
            const legacy = ['frameId', 'src', 'imageX', 'imageY', 'zoom', 'boxScale', 'imageWidth', 'imageHeight', 'frameAnimation'];
            const hasLegacy = legacy.some((key) => d.has(key));
            const extraElement: InvitationElement | undefined = !hasFrameElement && hasLegacy
                ? { id: `${sectionId}-frame`, kind: 'photoFrame', ...convertFrameFields(d, ctx) }
                : undefined;
            d.drop(...legacy);
            return { type, data: {}, extraElement };
        }
        case 'footer':
            return {
                type,
                data: {
                    text: text('text'),
                    textColor: cleanColor(d.str('textColor')),
                    font: cleanFont(d.str('font')),
                    link: link('link'),
                },
            };
        default:
            warn(ctx, d.path, `unknown section type "${type}", converted to an empty custom section`);
            return { type: 'blank', data: {} };
    }
}

function programIcon(item: Reader, ctx: ConvertContext) {
    const key = item.str('iconKey');
    const src = item.str('customIconSrc');
    const image = imageRef(src, ctx);
    if (image && (key === 'custom' || !key)) {
        return {
            kind: 'custom' as const,
            image,
            mode: item.str('customIconMode') === 'mask' ? ('mask' as const) : ('image' as const),
            name: item.str('customIconName'),
        };
    }
    item.drop('customIconMode', 'customIconName');
    if (key === 'none') return { kind: 'none' as const };
    if ((PROGRAM_ICONS as readonly string[]).includes(key)) return { kind: 'preset' as const, key: key as (typeof PROGRAM_ICONS)[number] };
    if (key && key !== 'auto') warn(ctx, `${item.path}.iconKey`, `unknown icon "${key}", used automatic`);
    return { kind: 'auto' as const };
}
