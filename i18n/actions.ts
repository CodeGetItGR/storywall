'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { type Locale, localeCookieName, locales } from '@/i18n/config';

export async function setLocale(locale: Locale) {
    if (!(locales as readonly string[]).includes(locale)) return;

    const cookieStore = await cookies();
    cookieStore.set(localeCookieName, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });
    revalidatePath('/');
}
