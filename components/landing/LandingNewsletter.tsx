'use client';

import { NewsletterSubscribeForm } from '@/components/newsletter/NewsletterSubscribeForm';
import { useAppNewsletterConfig } from '@/hooks/useAppConfig';

// The heading comes from the server footer so the whole block, heading
// included, disappears while the newsletter is switched off.
export function LandingNewsletter({ heading, headingClassName }: { heading: string; headingClassName: string }) {
    const config = useAppNewsletterConfig();
    if (!config) return null;

    return (
        <div className="mt-9 max-w-[360px] min-[761px]:mt-10">
            <div className={headingClassName}>{heading}</div>
            <NewsletterSubscribeForm config={config} tone="dark" />
        </div>
    );
}
