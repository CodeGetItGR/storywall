export function SpotifyMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M12 2.75a9.25 9.25 0 1 0 0 18.5A9.25 9.25 0 0 0 12 2.75Zm4.24 13.31a.9.9 0 0 1-1.24.3c-2.8-1.72-6.33-2.11-10.49-1.15a.9.9 0 1 1-.4-1.75c4.52-1.04 8.43-.6 11.64 1.37.43.26.57.82.29 1.23Zm1.03-2.29a1.13 1.13 0 0 1-1.55.38c-3.08-1.9-7.77-2.45-11.4-1.34a1.13 1.13 0 1 1-.66-2.16c4.14-1.26 9.27-.64 12.86 1.57.53.32.7.98.38 1.55Zm.04-2.43C13.7 9.27 7.74 9.08 4.28 10.15a1.37 1.37 0 1 1-.8-2.62c4.01-1.22 10.67-.99 15.08 1.62.7.41.93 1.32.5 2.02-.41.68-1.3.9-1.82.17Z"
                fill="currentColor"
            />
        </svg>
    );
}

export function YouTubeMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M21.6 7.4c-.2-.8-.8-1.4-1.6-1.6C18.5 5.5 12 5.5 12 5.5s-6.5 0-8 .3c-.8.2-1.4.8-1.6 1.6C2 9 2 12 2 12s0 3 .3 4.6c.2.8.8 1.4 1.6 1.6 1.5.3 8 .3 8 .3s6.5 0 8-.3c.8-.2 1.4-.8 1.6-1.6.3-1.6.3-4.6.3-4.6s0-3-.3-4.6Z"
                fill="currentColor"
            />
            <path d="m10 15.2 5.2-3.2L10 8.8v6.4Z" fill="#fff" />
        </svg>
    );
}
