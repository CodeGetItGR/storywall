import type { ShowcaseModule } from '@/hooks/useHomeModuleShowcase';

export function ModuleDescriptionPanel({ module: showcaseModule }: { module: ShowcaseModule }) {
    return (
        <div className="bg-gradient-logo flex min-w-0 shrink-0 basis-[calc(100%-2.5rem)] items-end overflow-hidden rounded-[1.75rem] p-7 shadow-[0_22px_55px_rgba(102,49,48,0.22)] sm:p-10">
            <p className="max-w-md text-xl leading-relaxed font-semibold text-white drop-shadow-sm sm:text-2xl">{showcaseModule.detail}</p>
        </div>
    );
}
