import { Abhaya_Libre, Alegreya, Geist } from 'next/font/google';

const geist = Geist({ subsets: ['latin'] });

const abhayaLibre = Abhaya_Libre({
    variable: '--font-abhaya-libre',
    subsets: ['latin'],
    weight: ['400'],
});

const alegreya = Alegreya({
    variable: '--font-alegreya',
    subsets: ['latin'],
    weight: ['400'],
});

// The app's fonts as <html> classes, shared by RootDocument and Storybook's preview.
export const rootFontClassName = `${geist.className} ${abhayaLibre.variable} ${alegreya.variable}`;
