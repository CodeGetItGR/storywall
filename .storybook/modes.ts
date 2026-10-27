// For components that only render at one breakpoint (hidden lg:flex, lg:hidden):
// snapshot just the width where they show, instead of an empty frame. Spread into
// `parameters`, and set the matching `globals: { viewport: { value } }` so the
// Storybook canvas opens at that width too.
export const desktopOnly = { chromatic: { modes: { desktop: { viewport: 'desktop' } } } };
export const mobileOnly = { chromatic: { modes: { mobile: { viewport: 'mobile' } } } };
