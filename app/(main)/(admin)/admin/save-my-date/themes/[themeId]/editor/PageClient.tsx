'use client';

import { InvitationEditorError, InvitationEditorLoading } from '@/components/saveMyDate/editor/InvitationEditorStatus';
import { ThemeEditor } from '@/components/saveMyDate/editor/ThemeEditor';
import { useAdminThemeEditorSource } from '@/hooks/useAdminThemeEditorSource';
import type { InvitationFontDto } from '@/lib/invitation/uploadedFonts';

type ThemeEditorPageProps = { themeId: string; uploadedFonts?: InvitationFontDto[]; prefetched?: boolean };

// The theme editor covers the admin's frame, like the old app's theme workspace.
export default function ThemeEditorPage({ themeId, uploadedFonts, prefetched }: ThemeEditorPageProps) {
    const { theme, isError, loadId, isReloading, retry, reload } = useAdminThemeEditorSource(themeId, { prefetched });

    return (
        <div className="fixed inset-0 z-[25]">
            {theme ? (
                <ThemeEditor key={loadId} theme={theme} uploadedFonts={uploadedFonts} onReload={reload} isReloading={isReloading} />
            ) : isError ? (
                <InvitationEditorError subject="theme" onRetry={retry} />
            ) : (
                <InvitationEditorLoading />
            )}
        </div>
    );
}
