'use client';

import { useEffect } from 'react';

import { useLandingMotion } from '@/providers/LandingMotionProvider';

// Mirrors the footer's motion toggle onto <body>, so CSS animations can pause too.
export function useLandingMotionPausedAttribute() {
    const { paused } = useLandingMotion();

    useEffect(() => {
        if (paused) document.body.dataset.landingMotionPaused = '';
        else delete document.body.dataset.landingMotionPaused;
        return () => {
            delete document.body.dataset.landingMotionPaused;
        };
    }, [paused]);
}
