import type * as NextIntl from 'next-intl';

import el from '@/messages/el.json';

// next-intl with useTranslations over the real Greek messages, so a part that reads its own alt text
// renders without NextIntlClientProvider. In a test file:
// vi.mock('next-intl', async (importOriginal) =>
//     (await import('@/components/occasions/wedding/__fixtures__/intlClientMock')).withGreekMessages(await importOriginal()),
// );
export function withGreekMessages(actual: typeof NextIntl): typeof NextIntl {
    const useTranslations = (namespace?: string) => actual.createTranslator({ locale: 'el', messages: el as NextIntl.Messages, namespace });
    return { ...actual, useTranslations: useTranslations as typeof NextIntl.useTranslations };
}
