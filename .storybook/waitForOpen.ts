import { within } from 'storybook/test';

// A menu or dialog opens a few frames after the click. A story that stops at the click can be captured before it appears.
export const waitForOpen = (role: 'menu' | 'dialog') => within(document.body).findByRole(role, {}, { timeout: 10_000 });
