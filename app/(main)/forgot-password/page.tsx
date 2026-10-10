import type { Metadata } from 'next';

import { ForgotPasswordPageContent } from '@/components/auth/ForgotPasswordPageContent';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: NO_INDEX };

export default function ForgotPasswordPage() {
    return <ForgotPasswordPageContent />;
}
