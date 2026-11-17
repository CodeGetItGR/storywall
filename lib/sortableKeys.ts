import type { BaseUIEvent } from '@base-ui/react/types';
import type { KeyboardEvent } from 'react';

// Base UI dialogs keep arrow keys inside themselves, but a keyboard drag listens for
// them on the document. Lets them out when they come from a drag handle.
export function letDragKeysThrough(event: BaseUIEvent<KeyboardEvent>) {
    if (event.target instanceof Element && event.target.closest('[aria-roledescription="sortable"]')) event.preventBaseUIHandler();
}
