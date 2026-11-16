import { CalendarDays, Clock, Gem, type LucideIcon, Megaphone, PencilLine, QrCode } from 'lucide-react';

export type JourneyIconKey =
    'details' | 'rsvp' | 'schedule' | 'gift' | 'invitations' | 'session' | 'media' | 'wishbook' | 'announcement' | 'playlist' | 'plan';

export type JourneyIcon = { kind: 'image'; src: string } | { kind: 'lucide'; icon: LucideIcon };

// The gradient images from public/icons where one exists; lucide for the rest.
export const journeyIcons: Record<JourneyIconKey, JourneyIcon> = {
    details: { kind: 'lucide', icon: PencilLine },
    rsvp: { kind: 'image', src: '/icons/rsvp.png' },
    schedule: { kind: 'lucide', icon: CalendarDays },
    gift: { kind: 'image', src: '/icons/present.svg' },
    invitations: { kind: 'lucide', icon: QrCode },
    session: { kind: 'lucide', icon: Clock },
    media: { kind: 'image', src: '/icons/camera.svg' },
    wishbook: { kind: 'image', src: '/icons/wishbook.svg' },
    announcement: { kind: 'lucide', icon: Megaphone },
    playlist: { kind: 'image', src: '/icons/music.svg' },
    plan: { kind: 'lucide', icon: Gem },
};
