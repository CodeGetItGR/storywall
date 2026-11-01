import type { LucideIcon } from 'lucide-react';

import type { VendorActionKey } from '@/lib/vendors';

export interface ContextNavItem {
    href: string;
    icon: LucideIcon;
    key: string;
    label: string;
    description?: string;
    // A vendor tool, drawn with its mini icon instead of the plain one.
    vendorTool?: VendorActionKey;
}
