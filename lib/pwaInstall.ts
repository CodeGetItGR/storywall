// How this device can install the app: 'prompt' where the browser offers its
// own install dialog (Chrome and Edge on Android and desktop), 'ios' where the
// visitor adds it from the share menu, null when installed or not possible.
export type PwaInstallMode = 'prompt' | 'ios' | null;

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const INSTALL_BANNER_DISMISSED_KEY = 'storywall:install-banner-dismissed';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
let listening = false;
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((listener) => listener());
}

export function isStandaloneDisplay(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// iPadOS reports itself as a Mac; the touch points give it away.
export function isIosDevice(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// The browser fires its install offer once, early, so it is caught for the
// whole app rather than by whichever screen happens to be mounted.
export function startPwaInstallListening(): () => void {
    if (listening) return () => undefined;
    listening = true;

    function handleBeforeInstallPrompt(event: Event) {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        notify();
    }

    function handleInstalled() {
        installed = true;
        deferredPrompt = null;
        notify();
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
        listening = false;
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleInstalled);
    };
}

export function subscribePwaInstall(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getPwaInstallMode(): PwaInstallMode {
    if (installed || isStandaloneDisplay()) return null;
    if (deferredPrompt) return 'prompt';
    return isIosDevice() ? 'ios' : null;
}

export function getServerPwaInstallMode(): PwaInstallMode {
    return null;
}

// The browser's offer can be used once; after that it is gone until it fires again.
export async function promptPwaInstall(): Promise<void> {
    const event = deferredPrompt;
    if (!event) return;
    deferredPrompt = null;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') installed = true;
    notify();
}
