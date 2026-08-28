import { modulePreviews } from '@/components/home/modulePreviews';
import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';
import {cn} from "@/lib/utils";

export function ModulePreviewPanel({ module: showcaseModule, ltr, previewMode }: { module: ShowcaseModule, ltr?: boolean,previewMode?:boolean,  }) {
    const Preview = modulePreviews[showcaseModule.key];

    return (
        <div className={cn("min-w-0 shrink-0 basis-[calc(100%-2.5rem)] overflow-hidden bg-card",
            {"rounded-r-[1.75rem]":ltr && previewMode, "rounded-l-[1.75rem]":!ltr && previewMode})}>
            {Preview && <Preview variant="page" />}
        </div>
    );
}
