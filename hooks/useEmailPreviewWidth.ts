'use client';

import { useState } from 'react';

export type EmailPreviewWidth = 'desktop' | 'phone';

export const EMAIL_PREVIEW_WIDTH_PX: Record<EmailPreviewWidth, number> = { desktop: 600, phone: 375 };

export function useEmailPreviewWidth() {
    const [width, setWidth] = useState<EmailPreviewWidth>('desktop');
    return { width, setWidth, widthPx: EMAIL_PREVIEW_WIDTH_PX[width] };
}
