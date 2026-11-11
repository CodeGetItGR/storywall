'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import { useCreateEventDialogHost } from '@/hooks/useCreateEventDialogHost';

const loadDialog = () => import('@/components/event/create/wizard/CreateEventDialog');
// Nothing of the wizard ships with the page; it loads on the first hover, focus or touch of a
// create link, or when the URL already asks for it.
const CreateEventDialog = dynamic(loadDialog, { ssr: false });
const preload = () => void loadDialog();

function Host() {
    const { isOpen, close } = useCreateEventDialogHost({ preload });
    return isOpen ? <CreateEventDialog onClose={close} /> : null;
}

// Mounted once per layout. useSearchParams needs the Suspense boundary on statically rendered pages.
export function CreateEventDialogHost() {
    return (
        <Suspense fallback={null}>
            <Host />
        </Suspense>
    );
}
