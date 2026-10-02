'use server';

import { updateTag } from 'next/cache';
import { cookies } from 'next/headers';

import { endpoints } from '@/lib/api/endpoints';
import { PUBLIC_CONFIG_CACHE_TAG, serverGet } from '@/lib/api/serverFetch';
import type { UserResponseDto } from '@/lib/api/types';
import { AUTH_COOKIES } from '@/lib/auth/authCookies';

// Drops the server-cached GET /api/config (see serverPublicConfigGet) after an
// admin edit, so the landing page shows the change on its next render instead
// of after the revalidate window. Admin-only: anyone else is a silent no-op.
export async function revalidatePublicConfig(): Promise<void> {
    const accessToken = (await cookies()).get(AUTH_COOKIES.accessToken)?.value;
    if (!accessToken) return;

    try {
        const me = await serverGet<UserResponseDto>(endpoints.me.profile, accessToken);
        if (me.platformRole !== 'ADMIN') return;
    } catch {
        return;
    }

    updateTag(PUBLIC_CONFIG_CACHE_TAG);
}
