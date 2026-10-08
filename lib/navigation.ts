// window.location.assign behind an import, so tests can observe it (jsdom's is not spyable).
export function assignLocation(url: string): void {
    window.location.assign(url);
}
