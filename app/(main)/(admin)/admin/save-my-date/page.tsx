import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

// The page opens on its first section.
export default function SaveMyDateAdminPage() {
    redirect(routes.saveMyDateAdmin.themes);
}
