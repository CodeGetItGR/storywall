import type { PROGRAM_ICONS } from '@/lib/invitation/sections';

export type ProgramIconKey = (typeof PROGRAM_ICONS)[number];

// Words in a row's label that pick its icon, in the old renderer's order.
const LABEL_ICONS: [RegExp, ProgramIconKey][] = [
    [/βαπτισ|μυστηρ|κολυμβ|κολυμπ|font/, 'baptism'],
    [/σταυρ|cross/, 'cross'],
    [/τελετ|εκκλησ|ναο|church/, 'church'],
    [/βερ|ring/, 'rings'],
    [/welcome|υποδοχ/, 'champagne'],
    [/drink|cocktail|ποτηρ|σαμπαν/, 'champagne'],
    [/γευμα|κερασ|φαγη|δειπν|δεξιω|τραπεζ|meal|dinner|reception/, 'dinner'],
    [/τουρτ|cake/, 'cake'],
    [/first\s*dance|πρωτ.*χορο|χορο|dance/, 'dance'],
    [/μουσικ|music/, 'music'],
    [/party|διασκεδ|disco/, 'disco'],
    [/confetti|κομφετι/, 'confetti'],
    [/λουλουδ|ανθοδεσ|flower|bouquet/, 'flowers'],
    [/περιστερ|dove/, 'dove'],
    [/cupcake/, 'cupcake'],
    [/δωρ|gift/, 'gift'],
    [/balloon|μπαλον/, 'balloon'],
    [/καρδ|heart/, 'heart'],
];

// The icon an "automatic" row shows.
export function programIconKeyForLabel(label: string): ProgramIconKey {
    const raw = label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();
    return LABEL_ICONS.find(([pattern]) => pattern.test(raw))?.[1] ?? 'stars';
}
