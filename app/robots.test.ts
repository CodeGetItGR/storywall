// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import robots from '@/app/robots';

describe('robots', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('keeps crawlers and link previews out of the business page and the old partner page', () => {
        vi.stubEnv('NEXT_PUBLIC_APP_ENV', 'production');
        const rules = robots().rules;
        const groups = Array.isArray(rules) ? rules : [rules];
        for (const group of groups) {
            expect(group.disallow).toEqual(expect.arrayContaining(['/business', '/partner']));
        }
    });
});
