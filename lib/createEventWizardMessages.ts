'use server';

import type { AbstractIntlMessages } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { CREATE_WIZARD_NAMESPACES } from '@/i18n/createWizardMessages';
import { pickNamespaces } from '@/i18n/publicMessages';

// The wizard's wording for the visitor's language, for the pop-up on public pages (see
// CreateEventWizardMessages). Public text only; no session is read.
export async function loadCreateWizardMessages(): Promise<AbstractIntlMessages> {
    return pickNamespaces(await getMessages(), CREATE_WIZARD_NAMESPACES);
}
