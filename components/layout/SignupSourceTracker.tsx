'use client';

import { useSignupSourceTracking } from '@/hooks/useSignupSourceTracking';

export function SignupSourceTracker() {
    useSignupSourceTracking();
    return null;
}
