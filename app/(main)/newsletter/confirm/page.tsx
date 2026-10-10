import type { Metadata } from 'next';

import { NewsletterTokenPageContent } from '@/components/newsletter/NewsletterTokenPageContent';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: NO_INDEX };

export default function NewsletterConfirmPage() {
    return <NewsletterTokenPageContent action="confirm" />;
}
