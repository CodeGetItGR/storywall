// Every namespace the create wizard pop-up reads (i18n/createWizardMessages.test.ts keeps this true).
// Public pages don't ship them; the pop-up fetches them when it first opens there.
export const CREATE_WIZARD_NAMESPACES = [
    'AcceptanceCheckboxes',
    'ApiErrors',
    'CheckoutReviewPage',
    'Common',
    'CreateEventPage',
    'Durations',
    'EventVoiceFallback',
    'GiftMode.form',
    'Incident',
    'LandingPage.pricing',
    'LoginPage',
    'ManagePage.settings.theme',
    'Modules',
    'OAuthButtons',
    'OAuthSignupAcceptance',
    'ProfilePage.business',
    'RegisterPage',
    'SessionUnavailable',
] as const;
