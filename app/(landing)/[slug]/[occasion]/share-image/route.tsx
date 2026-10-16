import { defaultLocale, locales } from '@/i18n/config';
import { occasionShareImageResponse } from '@/lib/occasions/occasionShareImage';

// `/el/gamos/share-image`: a localized occasion page's share image.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; occasion: string }> }) {
    const { slug, occasion } = await params;
    const locale = locales.find((candidate) => candidate === slug && candidate !== defaultLocale);
    if (!locale) return new Response(null, { status: 404 });
    return occasionShareImageResponse(locale, occasion);
}
