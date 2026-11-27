import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GraduationCap } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/GraduationCap';
import { PolaroidTape } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/PolaroidTape';
import { Sticker } from '@/components/saveMyDate/invitation/sections/family/graduates/decorations/Sticker';
import { INVITATION_LABELS } from '@/lib/invitation/labels';

afterEach(cleanup);

const labels = INVITATION_LABELS.el;

describe('graduates drawings', () => {
    it('names every drawing in the invitation language', () => {
        render(
            <>
                <GraduationCap labels={labels} />
                <PolaroidTape labels={labels} />
                {(['diploma', 'books', 'champagne', 'star', 'confetti'] as const).map((kind) => (
                    <Sticker key={kind} kind={kind} labels={labels} />
                ))}
            </>,
        );
        for (const name of ['Καπέλο αποφοίτησης', 'Ταινία', 'Δίπλωμα', 'Βιβλία', 'Σαμπάνια', 'Αστέρι', 'Κομφετί']) {
            expect(screen.getByRole('img', { name })).toBeTruthy();
        }
    });
});
