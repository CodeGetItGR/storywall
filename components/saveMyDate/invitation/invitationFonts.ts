import {
    Alegreya,
    Cinzel,
    Comfortaa,
    Cormorant_Garamond,
    EB_Garamond,
    GFS_Neohellenic,
    Josefin_Sans,
    Lora,
    Marcellus,
    Philosopher,
    Playfair_Display,
    Raleway,
} from 'next/font/google';
import localFont from 'next/font/local';

// The families the old editor loaded from Google Fonts, served from our own
// origin. next/font keeps each family's own name, so the font strings in an
// invitation document match as they are. Nothing is preloaded: the browser
// downloads only the faces an invitation actually uses. Same weights and
// styles as the old Google Fonts link: 400, plus italic where it asked for it.
const gfsNeohellenic = GFS_Neohellenic({ weight: '400', preload: false, variable: '--smd-font-gfs-neohellenic' });
const playfairDisplay = Playfair_Display({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-playfair-display' });
const cormorantGaramond = Cormorant_Garamond({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-cormorant-garamond' });
const ebGaramond = EB_Garamond({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-eb-garamond' });
const marcellus = Marcellus({ weight: '400', preload: false, variable: '--smd-font-marcellus' });
const cinzel = Cinzel({ weight: '400', preload: false, variable: '--smd-font-cinzel' });
const alegreya = Alegreya({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-alegreya' });
const lora = Lora({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-lora' });
const josefinSans = Josefin_Sans({ weight: '400', preload: false, variable: '--smd-font-josefin-sans' });
const comfortaa = Comfortaa({ weight: '400', preload: false, variable: '--smd-font-comfortaa' });
const raleway = Raleway({ weight: '400', preload: false, variable: '--smd-font-raleway' });
const philosopher = Philosopher({ weight: '400', style: ['normal', 'italic'], preload: false, variable: '--smd-font-philosopher' });

// Google renamed it Source Serif 4, which next/font/google lists instead, so
// the files Google still serves under the old name live in ./fonts.
const sourceSerifPro = localFont({
    src: [
        { path: './fonts/SourceSerifPro-Regular.woff', weight: '400', style: 'normal' },
        { path: './fonts/SourceSerifPro-Italic.woff', weight: '400', style: 'italic' },
    ],
    declarations: [{ prop: 'font-family', value: "'Source Serif Pro'" }],
    display: 'swap',
    preload: false,
    variable: '--smd-font-source-serif-pro',
});

// Applied to the invitation root so every page that renders one carries the
// @font-face rules. The classes only define CSS variables; they set no font.
export const INVITATION_FONT_CLASSES = [
    gfsNeohellenic,
    playfairDisplay,
    cormorantGaramond,
    ebGaramond,
    marcellus,
    cinzel,
    alegreya,
    lora,
    josefinSans,
    comfortaa,
    raleway,
    philosopher,
    sourceSerifPro,
]
    .map((font) => font.variable)
    .join(' ');
