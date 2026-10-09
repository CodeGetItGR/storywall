import type { Metadata } from 'next';

import { EmailVerificationPageContent } from '@/components/auth/EmailVerificationPageContent';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: NO_INDEX };

export default function VerifyEmailPage() {
    return <EmailVerificationPageContent />;
}
