'use client';

import { useContext } from 'react';

import type { EditorMode } from '@/lib/invitation/sectionRules';
import { AuthContext } from '@/providers/AuthProvider';

// Platform admins edit themes with the admin's settings too. Outside the
// app's sign-in (stories, tests) the editor is the host's.
export function useEditorMode(): EditorMode {
    const auth = useContext(AuthContext);
    return auth?.user?.role === 'ADMIN' ? 'admin' : 'host';
}
