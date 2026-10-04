import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MarkdownDocument } from '@/components/legal/MarkdownDocument';

afterEach(cleanup);

const source = ['# Community Guidelines', '', '## 6. Harassment, threats and bullying', '', 'Text.', '', '### 6.1 Examples', '', '## Contact'].join(
    '\n',
);

describe('MarkdownDocument', () => {
    it('gives each numbered section an anchor the statement emails link to', () => {
        render(<MarkdownDocument source={source} />);
        expect(screen.getByRole('heading', { level: 2, name: '6. Harassment, threats and bullying' }).id).toBe('section-6');
    });

    it('leaves unnumbered and lower headings without an id', () => {
        render(<MarkdownDocument source={source} />);
        expect(screen.getByRole('heading', { level: 2, name: 'Contact' }).id).toBe('');
        expect(screen.getByRole('heading', { level: 3, name: '6.1 Examples' }).id).toBe('');
        expect(screen.getByRole('heading', { level: 1 }).id).toBe('');
    });
});
