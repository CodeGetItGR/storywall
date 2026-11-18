import { AllSetCard } from '@/components/manage/overview/AllSetCard';
import { JourneyPath } from '@/components/manage/overview/JourneyPath';
import { JourneyTotals } from '@/components/manage/overview/JourneyTotals';
import { PhaseStepper } from '@/components/manage/overview/PhaseStepper';
import { PlanLine } from '@/components/manage/overview/PlanLine';
import { QuickTools } from '@/components/manage/overview/QuickTools';
import type { JourneyTotal, QuickTool } from '@/hooks/useDayJourney';
import type { PhaseStep } from '@/hooks/useEventJourneyPhase';
import type { OverviewPlanLine } from '@/hooks/useOverviewPlanLine';
import type { JourneyPhase, JourneyStopModel } from '@/lib/eventJourney';

export type OverviewJourneyViewProps = {
    labels: { getReady: string; day: string; afterEvent: string };
    steps: PhaseStep[];
    selected: JourneyPhase;
    onSelectPhase: (phase: JourneyPhase) => void;
    before: { stops: JourneyStopModel[]; allDone: boolean; printHref: string };
    day: { stops: JourneyStopModel[]; tools: QuickTool[]; totals: JourneyTotal[] };
    after: { stops: JourneyStopModel[] };
    planLine: OverviewPlanLine | null;
    // An event without a date (a lite event) has no phases: one path, its setup then what comes after.
    undated?: boolean;
};

/** The Overview of a live event: the phase stepper and that phase's journey. */
export function OverviewJourneyView({ labels, steps, selected, onSelectPhase, before, day, after, planLine, undated = false }: OverviewJourneyViewProps) {
    const plan = planLine ? <PlanLine line={planLine} /> : null;

    if (undated) {
        // Only one stop is current: the next setup stop while there is one.
        const later = before.allDone ? after.stops : after.stops.map((stop) => (stop.status === 'current' ? { ...stop, status: 'upcoming' as const } : stop));
        return (
            <div className="flex flex-col gap-6">
                {/* Path: setup, then the gallery, wishbook and plan */}
                <JourneyPath label={labels.getReady} stops={[...before.stops, ...later]} end="heart" endLabel={labels.afterEvent} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Phases */}
            <PhaseStepper steps={steps} selected={selected} onSelect={onSelectPhase} />

            {/* Before */}
            {selected === 'before' && (
                <JourneyPath
                    label={labels.getReady}
                    stops={before.stops}
                    end="day"
                    endLabel={labels.day}
                    replacementCard={before.allDone ? <AllSetCard printHref={before.printHref} aside={plan} /> : undefined}
                    aside={plan}
                />
            )}

            {/* On the day: tools under the path on small screens, beside it on desktop */}
            {selected === 'day' && (
                <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
                    {/* Path */}
                    <JourneyPath label={labels.day} stops={day.stops} end="night" endLabel={labels.day} />
                    {/* Tools and totals */}
                    <div className="flex flex-col gap-3">
                        <QuickTools tools={day.tools} />
                        <JourneyTotals totals={day.totals} />
                    </div>
                </div>
            )}

            {/* After */}
            {selected === 'after' && <JourneyPath label={labels.afterEvent} stops={after.stops} end="heart" endLabel={labels.afterEvent} />}

            {/* Plan (small screens; on desktop the Before card shows it) */}
            {selected !== 'after' && plan && <div className={selected === 'before' ? 'lg:hidden' : undefined}>{plan}</div>}
        </div>
    );
}
