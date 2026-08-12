'use client';

export function PlansErrorState({ message }: { message: string }) {
    return (
        <main className="h-full overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-10">
                <p className="text-sm text-rose-600">{message}</p>
            </div>
        </main>
    );
}
