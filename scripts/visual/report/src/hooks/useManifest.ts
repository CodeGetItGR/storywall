import { useEffect, useState } from 'react';

import { buildModel, type ReportManifest, type ReportModel } from '../lib/model';

type ManifestState = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; model: ReportModel };

export function useManifest(): ManifestState {
    const [state, setState] = useState<ManifestState>({ status: 'loading' });

    useEffect(() => {
        let cancelled = false;
        fetch('manifest.json')
            .then((response) => {
                if (!response.ok) throw new Error(`Manifest returned ${response.status}`);
                return response.json() as Promise<ReportManifest>;
            })
            .then((manifest) => {
                if (!cancelled) setState({ status: 'ready', model: buildModel(manifest) });
            })
            .catch(() => {
                if (!cancelled) setState({ status: 'failed' });
            });
        return () => {
            cancelled = true;
        };
    }, []);

    return state;
}
