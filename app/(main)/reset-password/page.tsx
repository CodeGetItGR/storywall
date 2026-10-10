import type { Metadata } from 'next';

import { ResetPasswordPageContent } from '@/components/auth/ResetPasswordPageContent';
import { NO_INDEX } from '@/lib/seo';

export const metadata: Metadata = { robots: NO_INDEX };

export default function ResetPasswordPage() {
    return <ResetPasswordPageContent />;
}
