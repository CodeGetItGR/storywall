// The link preview picture of an invitation with no photo: its title on the theme's colours. Drawn by
// next/og (Satori), so only inline styles and flex layout; Storybook renders the same markup.
export type InvitationShareCardProps = {
    text: string;
    background: string;
    color: string;
    accent: string;
    fontFamily: string;
};

export function InvitationShareCard({ text, background, color, accent, fontFamily }: InvitationShareCardProps) {
    const fontSize = text.length > 40 ? 72 : 96;
    return (
        <div
            style={{
                // The frame is placed against the card, in a browser too.
                position: 'relative',
                width: 1200,
                height: 630,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 96px',
                background,
                color,
                fontFamily,
            }}
        >
            {/* Frame */}
            <div
                style={{
                    position: 'absolute',
                    top: 32,
                    left: 32,
                    width: 1136,
                    height: 566,
                    border: `3px solid ${accent}`,
                    borderRadius: 24,
                }}
            />
            {/* Title */}
            <div style={{ display: 'block', fontSize, lineHeight: 1.1, textAlign: 'center', maxWidth: 1008, lineClamp: 3 }}>{text}</div>
        </div>
    );
}
