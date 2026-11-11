// @vitest-environment node
import { cpus } from 'node:os';

import { describe, expect, it } from 'vitest';

import { allFailedSoFar, MACHINE } from './capture';

describe('allFailedSoFar', () => {
    it('is true when the first 20 captures all failed', () => {
        expect(allFailedSoFar(20, 20)).toBe(true);
    });

    it('is false before 20 captures are done', () => {
        expect(allFailedSoFar(19, 19)).toBe(false);
    });

    it('is false when any of the first 20 captures worked', () => {
        expect(allFailedSoFar(20, 19)).toBe(false);
    });

    it('is false after the 20th capture, so it only decides once', () => {
        expect(allFailedSoFar(21, 21)).toBe(false);
    });
});

describe('MACHINE', () => {
    it('names this machine by its CPU model', () => {
        expect(MACHINE).toBe(cpus()[0]?.model.trim() || 'unknown');
        expect(MACHINE.length).toBeGreaterThan(0);
    });
});
