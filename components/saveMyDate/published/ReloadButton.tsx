'use client';

import { RefreshCw } from 'lucide-react';

function reloadPage() {
    window.location.reload();
}

// Loads the page again. The label comes from the server: this layout sends no messages to the browser.
export function ReloadButton({ label }: { label: string }) {
    return (
        <button
            type="button"
            onClick={reloadPage}
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity bg-gradient-brand hover:opacity-90"
        >
            <RefreshCw aria-hidden className="h-4 w-4" />
            {label}
        </button>
    );
}
