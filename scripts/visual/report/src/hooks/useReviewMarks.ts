import { useEffect, useState } from 'react';

import type { ReportEntry } from '../../../types';
import { type Marks, marksKey, readMarks, withMarks, withoutMarks, writeMarks } from '../lib/marks';
import type { ReportModel } from '../lib/model';

export type Review = { marks: Marks; mark: (entries: ReportEntry[]) => void; unmark: (entries: ReportEntry[]) => void };

export function useReviewMarks(model: ReportModel): Review {
    const key = marksKey(model.manifest);
    const [marks, setMarks] = useState<Marks>(() => readMarks(key));

    // The same report open in another tab saves marks too, so take them in instead of saving over them.
    useEffect(() => {
        function handleStorage(event: StorageEvent) {
            if (event.key === key || event.key === null) setMarks(readMarks(key));
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [key]);

    function save(next: Marks) {
        setMarks(next);
        writeMarks(key, next);
    }

    return {
        marks,
        mark: (entries) => save(withMarks(marks, entries)),
        unmark: (entries) => save(withoutMarks(marks, entries)),
    };
}
