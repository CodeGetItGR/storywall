// A Shopify collection handle, as Spring accepts it (InviartCollectionSetDto).
const HANDLE = /^[a-z0-9][a-z0-9-]{0,254}$/;

export function isInviartHandle(value: string): boolean {
    return HANDLE.test(value);
}
