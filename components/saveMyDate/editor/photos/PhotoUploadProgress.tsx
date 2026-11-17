type PhotoUploadProgressProps = {
    percent: number;
    label: string;
};

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// A ring over the photo slot while its upload runs. The slot can't be used meanwhile.
export function PhotoUploadProgress({ percent, label }: PhotoUploadProgressProps) {
    return (
        <div
            role="progressbar"
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-black/45 text-xs font-semibold text-white"
        >
            <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
                <circle cx="20" cy="20" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
                <circle
                    cx="20"
                    cy="20"
                    r={RADIUS}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
                    className="transition-[stroke-dashoffset] duration-200"
                />
            </svg>
            <span>{label}</span>
        </div>
    );
}
