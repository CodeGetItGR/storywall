'use client';

import { EventCreateFooter } from '@/components/event/create/EventCreateFooter';
import { useCreateEventWizardFooter } from '@/hooks/useCreateEventWizardFooter';

// Type and plan: one full-width gradient button with an ink label (6.3:1 and up; white fails).
// Details, theme and overview keep today's footer until part 3.
export function CreateEventWizardFooter() {
    const action = useCreateEventWizardFooter();
    if (!action) return <EventCreateFooter />;

    return (
        <footer className="shrink-0 bg-linear-to-b from-white/0 to-white to-30% px-5 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
            <button
                type="button"
                disabled={action.disabled}
                onClick={action.onClick}
                className="h-14 w-full rounded-full bg-[linear-gradient(120deg,#ff6fa0,#ff7a59_55%,#ffb259)] text-[17px] font-bold text-ink focus-ring transition-[opacity,transform] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:active:scale-100"
            >
                {action.label}
            </button>
        </footer>
    );
}
