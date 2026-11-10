// Every namespace the create wizard pop-up reads (i18n/createWizardMessages.test.ts keeps this true).
// Public pages don't ship them; the pop-up fetches them when it first opens there.
export const CREATE_WIZARD_NAMESPACES = [
    'ApiErrors',
    'CheckoutReviewPage',
    'Common',
    'CreateEventPage',
    'Durations',
    'EventVoiceFallback',
    'GiftMode.form',
    'Incident',
    'LandingPage.pricing',
    'ManagePage.settings.theme',
    'Modules',
    'ProfilePage.business',
    'SessionUnavailable',
] as const;
