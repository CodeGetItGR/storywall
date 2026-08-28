import { modulePreviews } from '@/components/home/modulePreviews';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';

export function ModulePreviewPanel({ module: showcaseModule }: { module: ShowcaseModule }) {
    const Preview = modulePreviews[showcaseModule.key];

    return (
        <div className="min-w-0 shrink-0 basis-[calc(100%-2.5rem)] overflow-hidden rounded-[1.75rem] bg-card shadow-[0_22px_55px_rgba(70,44,30,0.16)]">
            {Preview && <Preview variant="page" />}
        </div>
    );
}
