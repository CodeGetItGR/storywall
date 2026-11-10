const SHAPE = 'fixed inset-x-2 z-40 mx-auto max-w-xl rounded-3xl bg-background p-4 text-ink shadow-[0_18px_50px_rgba(36,31,26,0.22)] sm:p-5';

// The cookie question's box. At the bottom, as it has always been; with the create wizard on, phones
// get it at the top instead, so it never meets the phone create button. From 761px up it stays put.
export function cookieBannerClassName(topOnPhones: boolean): string {
    if (!topOnPhones) {
        return 'fixed inset-x-2 bottom-[calc(var(--visual-viewport-bottom-inset,0px)+0.5rem)] z-40 mx-auto max-w-xl rounded-3xl bg-background p-4 text-ink shadow-[0_18px_50px_rgba(36,31,26,0.22)] sm:bottom-6 sm:p-5';
    }
    return `${SHAPE} top-[calc(env(safe-area-inset-top,0px)+0.5rem)] min-[761px]:top-auto min-[761px]:bottom-6`;
}
