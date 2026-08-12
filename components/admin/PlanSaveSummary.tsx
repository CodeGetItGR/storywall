import type { PendingPlanSave } from '@/lib/adminPlanEditor';

export function PlanSaveSummary({ pendingSave }: { pendingSave: PendingPlanSave | null }) {
    if (!pendingSave) return null;
    const hasChanges = pendingSave.changes.length > 0 || pendingSave.moduleChanges.length > 0;

    if (!hasChanges) {
        return <p>No changes detected. You can cancel and keep editing.</p>;
    }

    return (
        <div className="space-y-4">
            <p>Review the exact updates before they are applied.</p>
            {pendingSave.changes.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink">Plan fields</p>
                    <dl className="divide-y divide-border border-y border-border">
                        {pendingSave.changes.map((change) => (
                            <div key={change.label} className="grid gap-2 py-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
                                <dt className="font-semibold text-ink">{change.label}</dt>
                                <dd className="min-w-0 text-ink-muted">
                                    <span className="break-words line-through decoration-ink-faint">{change.before}</span>
                                    <span className="px-2 text-ink-faint">to</span>
                                    <span className="break-words font-semibold text-ink">{change.after}</span>
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
            {pendingSave.moduleChanges.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink">Modules</p>
                    <ul className="divide-y divide-border border-y border-border">
                        {pendingSave.moduleChanges.map((change) => (
                            <li key={`${change.tone}:${change.label}`} className="flex items-center justify-between gap-3 py-2">
                                <span className="font-semibold text-ink">{change.label}</span>
                                <span className={change.tone === 'added' ? 'text-emerald-700' : 'text-rose-600'}>
                                    {change.tone === 'added' ? 'Will be enabled' : 'Will be disabled'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
