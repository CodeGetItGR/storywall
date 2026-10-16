import { defaultLocale } from '@/i18n/config';
import { occasionShareImageResponse } from '@/lib/occasions/occasionShareImage';

// `/weddings/share-image`: the English occasion page's share image.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    return occasionShareImageResponse(defaultLocale, slug);
}
