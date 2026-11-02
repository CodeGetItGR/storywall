import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MarkdownDocument } from '@/components/legal/MarkdownDocument';

const intl = vi.hoisted(() => ({ locale: 'en' }));

vi.mock('next-intl', () => ({ useLocale: () => intl.locale }));

afterEach(() => {
    cleanup();
    intl.locale = 'en';
});

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

    it('moves every heading down by headingOffset, keeping its look', () => {
        render(<MarkdownDocument source={source} headingOffset={1} />);
        expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: 'Community Guidelines' })).toHaveClass('text-2xl');
        expect(screen.getByRole('heading', { level: 3, name: '6. Harassment, threats and bullying' }).id).toBe('section-6');
    });
});

describe('MarkdownDocument links', () => {
    it('renders same-site links and email addresses as links', () => {
        render(<MarkdownDocument source={'See the [Privacy Policy](/legal/privacy) or write to help@storywall.gr.'} />);
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/legal/privacy');
        expect(screen.getByRole('link', { name: 'help@storywall.gr' })).toHaveAttribute('href', 'mailto:help@storywall.gr');
    });

    it('keeps a Greek reader on the Greek legal pages', () => {
        intl.locale = 'el';
        render(<MarkdownDocument source={'See the [Privacy Policy](/legal/privacy#section-3).'} />);
        expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/el/legal/privacy#section-3');
    });

    it('opens external links in a new tab', () => {
        render(<MarkdownDocument source={'Visit [the Authority](https://www.dpa.gr).'} />);
        expect(screen.getByRole('link', { name: 'the Authority' })).toHaveAttribute('target', '_blank');
    });
});
