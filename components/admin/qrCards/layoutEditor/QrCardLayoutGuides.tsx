import { QR_CARD_HEIGHT, QR_CARD_WIDTH } from '@/lib/qrCard';
import type { QrCardGuide } from '@/lib/qrCardLayout';

// The snap lines while dragging: full-card hairlines in the accent colour.
export function QrCardLayoutGuides({ guides }: { guides: QrCardGuide[] }) {
    return (
        <g className="text-primary" pointerEvents="none">
            {guides.map((guide) =>
                guide.axis === 'x' ? (
                    <line
                        key={`x-${guide.at}`}
                        x1={guide.at}
                        x2={guide.at}
                        y1={0}
                        y2={QR_CARD_HEIGHT}
                        stroke="currentColor"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                ) : (
                    <line
                        key={`y-${guide.at}`}
                        y1={guide.at}
                        y2={guide.at}
                        x1={0}
                        x2={QR_CARD_WIDTH}
                        stroke="currentColor"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                    />
                ),
            )}
        </g>
    );
}
