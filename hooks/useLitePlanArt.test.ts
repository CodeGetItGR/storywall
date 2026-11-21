import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useLitePlanArt } from '@/hooks/useLitePlanArt';

vi.mock('next-intl', () => ({ useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}` }));
vi.mock('@/hooks/useModuleCopy', () => ({ useModuleCopy: () => (moduleKey: string) => ({ name: moduleKey }) }));
vi.mock('@/hooks/useQrCardFeatureTexts', () => ({ useQrCardFeatureTexts: () => ({}) }));

describe('useLitePlanArt', () => {
    it('has five wishes: three written, then two voice wishes for the wide banner', () => {
        const { wishes } = renderHook(() => useLitePlanArt('wishbook', 'Anna & Kostas')).result.current;

        expect(wishes).toEqual([
            { author: 'QrCodePage.preview.wishAuthor', message: 'QrCodePage.preview.wishText' },
            { author: 'QrCodePage.preview.story4', message: 'CreateEventPage.wizard.details.liteArt.wishGiorgos' },
            { author: 'QrCodePage.preview.story3', message: 'CreateEventPage.wizard.details.liteArt.wishSofia' },
            { author: 'QrCodePage.preview.story2', voiceMs: 58_000 },
            { author: 'QrCodePage.preview.postAuthor', voiceMs: 42_000 },
        ]);
    });
});
