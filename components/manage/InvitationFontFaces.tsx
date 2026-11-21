import { INVITATION_FONT_CLASSES } from '@/components/saveMyDate/invitation/invitationFonts';

// The Save my date fonts the theme cards' titles use. Importing them declares their faces; the
// uploaded ones come as CSS. FeedThemePicker loads this only once it lists Save my date cards.
export function InvitationFontFaces({ css }: { css: string }) {
    return (
        <>
            <span hidden className={INVITATION_FONT_CLASSES} />
            {/* Uploaded fonts: built only from validated names and urls, so safe to inline */}
            {css && <style>{css}</style>}
        </>
    );
}
