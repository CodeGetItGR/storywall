// Needs an `@container` ancestor with `overflow-hidden`; the sweep spans that container's width.
export function LightRay() {
    return (
        <div
            className="light-ray pointer-events-none absolute -top-20 z-20 h-[200%] w-48 rotate-24 bg-linear-to-r from-transparent via-[#fff2a8]/45 to-transparent mix-blend-screen"
            aria-hidden="true"
        />
    );
}
