import type { Ref, UIEventHandler } from 'react';

import type { ReportEntry } from '../../../../types';
import { copy } from '../../copy';
import { altText } from '../../lib/labels';

export type ImageKind = 'before' | 'after' | 'diff';

const LABELS: Record<ImageKind, string> = { before: copy.before, after: copy.after, diff: copy.diff };

type CaptureFigureProps = { entry: ReportEntry; kind: ImageKind; frameRef?: Ref<HTMLDivElement>; onFrameScroll?: UIEventHandler<HTMLDivElement> };

export function CaptureFigure({ entry, kind, frameRef, onFrameScroll }: CaptureFigureProps) {
    const src = entry.images[kind];
    return (
        <figure className="fig">
            <figcaption>{LABELS[kind]}</figcaption>
            <div className="frame" ref={frameRef} onScroll={onFrameScroll}>
                {/* A new key removes the old image at once, so it never shows under the wrong caption. */}
                <img key={src} src={src} alt={altText(entry, LABELS[kind].toLowerCase())} decoding="async" />
            </div>
        </figure>
    );
}
