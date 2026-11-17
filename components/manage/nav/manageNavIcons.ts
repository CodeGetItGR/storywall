// components/manage/nav/manageNavIcons.ts
import { CreditCard, Gift, LayoutDashboard, type LucideIcon, Palette, Settings, Store, Ticket, Trash2, Users } from 'lucide-react';

import type { ManageNavKey } from '@/lib/manageSections';

// Invitations & QR codes and Vendors keep the icons they have in the event menu.
export const manageNavIcons: Record<ManageNavKey, LucideIcon> = {
    overview: LayoutDashboard,
    settings: Settings,
    theme: Palette,
    billing: CreditCard,
    gift: Gift,
    rsvp: Users,
    invitationsQr: Ticket,
    members: Users,
    vendors: Store,
    danger: Trash2,
};
