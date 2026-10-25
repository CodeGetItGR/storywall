import { createTranslator, type Messages } from 'next-intl';

import el from '@/messages/el.json';
import en from '@/messages/en.json';

const MESSAGES: Record<string, Messages> = { el, en };

// next-intl/server's getTranslations over the real messages, so a server component test reads the
// page's own copy. In a test file: vi.mock('next-intl/server', () => import('@/test/intlServerMock'));
// A call without a locale reads Greek.
export async function getTranslations(options: string | { locale?: string; namespace?: string }) {
    const { locale = 'el', namespace } = typeof options === 'string' ? { namespace: options } : options;
    return createTranslator({ locale, messages: MESSAGES[locale]!, namespace });
}
