import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VoiceRecorder } from '@/components/wishbook/VoiceRecorder';
import type { VoiceRecorder as VoiceRecorderState } from '@/hooks/useVoiceRecorder';

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function recorder(overrides: Partial<VoiceRecorderState> = {}): VoiceRecorderState {
    return { status: 'idle', elapsedMs: 0, recording: null, start: vi.fn(), stop: vi.fn(), discard: vi.fn(), ...overrides };
}

afterEach(cleanup);

describe('VoiceRecorder', () => {
    it('draws nothing where recording is not possible', () => {
        const { container } = render(<VoiceRecorder recorder={recorder({ status: 'unsupported' })} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('starts recording', () => {
        const r = recorder();
        render(<VoiceRecorder recorder={r} />);
        fireEvent.click(screen.getByRole('button', { name: 'record' }));
        expect(r.start).toHaveBeenCalled();
    });

    it('shows the time and stops', () => {
        const r = recorder({ status: 'recording', elapsedMs: 12_000 });
        render(<VoiceRecorder recorder={r} />);
        expect(screen.getByText('0:12 / 1:00')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'stop' }));
        expect(r.stop).toHaveBeenCalled();
    });

    it('plays back, records again or removes a finished recording', () => {
        const r = recorder({ status: 'recorded', recording: { blob: new Blob(), url: 'blob:x', durationMs: 4_000 } });
        render(<VoiceRecorder recorder={r} />);
        expect(screen.getByRole('button', { name: 'play' })).toBeInTheDocument();
        expect(screen.getByText('0:04')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'recordAgain' }));
        expect(r.start).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'removeRecording' }));
        expect(r.discard).toHaveBeenCalled();
    });

    it('says the microphone is blocked', () => {
        render(<VoiceRecorder recorder={recorder({ status: 'denied' })} />);
        expect(screen.getByRole('button', { name: 'record' })).toBeInTheDocument();
        expect(screen.getByText('micBlocked')).toBeInTheDocument();
    });

    it('offers to replace or remove an existing recording', () => {
        const r = recorder();
        const onRemoveExisting = vi.fn();
        render(<VoiceRecorder recorder={r} existing={{ url: 'https://r2.test/a.m4a', durationMs: 9_000 }} onRemoveExisting={onRemoveExisting} />);
        expect(screen.getByText('0:09')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'recordAgain' }));
        expect(r.start).toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'removeRecording' }));
        expect(onRemoveExisting).toHaveBeenCalled();
    });

    it('shows a new recording over the existing one', () => {
        const r = recorder({ status: 'recorded', recording: { blob: new Blob(), url: 'blob:x', durationMs: 4_000 } });
        const onRemoveExisting = vi.fn();
        render(<VoiceRecorder recorder={r} existing={{ url: 'https://r2.test/a.m4a', durationMs: 9_000 }} onRemoveExisting={onRemoveExisting} />);
        expect(screen.getByText('0:04')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'removeRecording' }));
        expect(r.discard).toHaveBeenCalled();
        expect(onRemoveExisting).not.toHaveBeenCalled();
    });

    it('disables its buttons while the form sends', () => {
        render(<VoiceRecorder recorder={recorder()} disabled />);
        expect(screen.getByRole('button', { name: 'record' })).toBeDisabled();
    });

    it('keeps its buttons thumb-sized', () => {
        render(<VoiceRecorder recorder={recorder()} />);
        expect(screen.getByRole('button', { name: 'record' })).toHaveClass('min-h-11');
    });
});
