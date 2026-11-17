import { ReportApp } from './components/ReportApp';
import { copy } from './copy';
import { useManifest } from './hooks/useManifest';

export function App() {
    const report = useManifest();
    if (report.status === 'ready') return <ReportApp model={report.model} />;
    return (
        <main className="status">
            <h1>{copy.title}</h1>
            <p>{report.status === 'loading' ? copy.loading : copy.loadFailed}</p>
        </main>
    );
}
