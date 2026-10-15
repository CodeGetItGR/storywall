export function GoogleCalendarMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M6 2h12v4H6z" fill="#4285F4" />
            <path d="M18 6h4v12h-4z" fill="#4285F4" />
            <path d="M6 18h12v4H6z" fill="#34A853" />
            <path d="M2 6h4v12H2z" fill="#FBBC04" />
            <path d="M6 2H4.5A2.5 2.5 0 0 0 2 4.5V6h4V2Z" fill="#1967D2" />
            <path d="M2 18v1.5A2.5 2.5 0 0 0 4.5 22H6v-4H2Z" fill="#188038" />
            <path d="M18 2h1.5A2.5 2.5 0 0 1 22 4.5V6h-4V2Z" fill="#1967D2" />
            <path d="M18 22v-4h4l-4 4Z" fill="#EA4335" />
            <path d="M6 6h12v12H6z" fill="#fff" />
            <text x="12" y="15.4" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="8.5" fontWeight="700" fill="#4285F4">
                31
            </text>
        </svg>
    );
}

export function AppleMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path
                d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09ZM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                fill="currentColor"
            />
        </svg>
    );
}

export function OutlookMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M9 4.5A1.5 1.5 0 0 1 10.5 3h10A1.5 1.5 0 0 1 22 4.5V12H9V4.5Z" fill="#0364B8" />
            <path d="M9 12h13v7.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 9 19.5V12Z" fill="#28A8EA" />
            <path d="m9 12 6.5 4 6.5-4" stroke="#0F6CBD" strokeWidth="1.2" />
            <rect x="2" y="6" width="12" height="12" rx="1.5" fill="#0F6CBD" />
            <ellipse cx="8" cy="12" rx="2.7" ry="3.4" stroke="#fff" strokeWidth="1.8" />
        </svg>
    );
}

export function Microsoft365Mark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <path d="M3 3h8.5v8.5H3z" fill="#F25022" />
            <path d="M12.5 3H21v8.5h-8.5z" fill="#7FBA00" />
            <path d="M3 12.5h8.5V21H3z" fill="#00A4EF" />
            <path d="M12.5 12.5H21V21h-8.5z" fill="#FFB900" />
        </svg>
    );
}
