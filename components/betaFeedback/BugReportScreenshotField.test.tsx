import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BugReportScreenshotField } from '@/components/betaFeedback/BugReportScreenshotField';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

afterEach(cleanup);

describe('BugReportScreenshotField', () => {
    it('anchors the hidden file input to its label, so focusing it does not shift the modal', () => {
        const { container } = render(
            <BugReportScreenshotField
                accept="image/*"
                disabled={false}
                error={null}
                file={null}
                maxMegabytes={5}
                onChangeAction={vi.fn()}
                onRemoveAction={vi.fn()}
            />,
        );

        expect(container.querySelector('input[type="file"]')?.closest('label')).toHaveClass('relative');
    });
});
