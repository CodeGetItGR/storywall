import { Check, Sparkles } from 'lucide-react';

// The discount drawn as a ticket with confetti, in the style of the vendor tools' drawings. Shows the
// percent on offer, or a tick once the guest holds a code. Only the percent is read out; the rest is
// decoration.
export function GuestOfferTicket({ label }: { label: string | null }) {
    return (
        // Drawn at 100×88 and shown at 80%.
        <div className="relative h-[70px] w-20 shrink-0">
            <div className="relative h-[88px] w-[100px] origin-top-left scale-[0.8]">
                {/* Confetti */}
                <span aria-hidden="true" className="absolute top-2.5 left-1.5 size-1.5 rounded-full bg-[#F4A6B8]" />
                <span aria-hidden="true" className="absolute top-0.5 left-4.5 h-[3px] w-[7px] rotate-30 rounded-sm bg-[#F9C29A]" />
                <span aria-hidden="true" className="absolute right-1 bottom-2 size-[5px] rounded-full bg-[#E48279]" />
                <Sparkles aria-hidden="true" className="absolute top-1 right-1.5 size-3.5 text-[#FEC463]" />

                {/* Ticket */}
                <div className="absolute top-[22px] left-2 flex h-[46px] w-[84px] -rotate-8 items-center rounded-[10px] bg-[linear-gradient(132deg,#C777B1_20%,#E48279_43%,#F2885C_54%,#FEC463_99%)] shadow-md">
                    <span aria-hidden="true" className="absolute -top-1.5 left-[52px] size-3 rounded-full bg-[#fce3e3]" />
                    <span aria-hidden="true" className="absolute -bottom-1.5 left-[52px] size-3 rounded-full bg-[#fce3e3]" />
                    <span aria-hidden="true" className="absolute inset-y-2 left-[57px] border-l-2 border-dashed border-white/60" />
                    <span className="flex w-14 items-center justify-center text-[17px] font-bold text-white">
                        {label ?? <Check aria-hidden="true" className="size-[22px]" strokeWidth={3} />}
                    </span>
                    <span aria-hidden="true" className="flex w-7 flex-col items-center gap-1">
                        <span className="h-1 w-3 rounded-full bg-white/70" />
                        <span className="h-1 w-2 rounded-full bg-white/50" />
                    </span>
                </div>
            </div>
        </div>
    );
}
