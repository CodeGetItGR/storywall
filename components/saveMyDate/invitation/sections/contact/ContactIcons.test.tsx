import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { ContactIcons } from '@/components/saveMyDate/invitation/sections/contact/ContactIcons';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

it('draws Instagram as its mark: a rounded square, a lens and a dot', () => {
    const fields = { phone: '', sms: '', email: '', facebook: '', instagram: 'instagram.com/example', tiktok: '' };
    render(<ContactIcons fields={fields} labels={INVITATION_LABELS.en} />);

    const link = screen.getByRole('link', { name: INVITATION_LABELS.en.contactInstagram });
    expect(link).toHaveAttribute('href', 'https://instagram.com/example');
    expect(link.querySelectorAll('rect')).toHaveLength(1);
    expect(link.querySelectorAll('circle')).toHaveLength(2);
    expect(link.querySelector('path')).toBeNull();
});
