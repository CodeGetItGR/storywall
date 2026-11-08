type SegmentOption<T extends string> = { value: T; label: string };

type SegmentButtonProps<T extends string> = { option: SegmentOption<T>; selected: boolean; disabled?: boolean; onPick: (value: T) => void };

function SegmentButton<T extends string>({ option, selected, disabled, onPick }: SegmentButtonProps<T>) {
    function handleClick() {
        onPick(option.value);
    }
    return (
        <button type="button" disabled={disabled} aria-pressed={selected} onClick={handleClick}>
            {option.label}
        </button>
    );
}

type SegmentProps<T extends string> = { label: string; options: SegmentOption<T>[]; value: T; disabled?: boolean; onPick: (value: T) => void };

export function Segment<T extends string>({ label, options, value, disabled, onPick }: SegmentProps<T>) {
    return (
        <div className="seg" role="group" aria-label={label}>
            {options.map((option) => (
                <SegmentButton key={option.value} option={option} selected={option.value === value} disabled={disabled} onPick={onPick} />
            ))}
        </div>
    );
}
