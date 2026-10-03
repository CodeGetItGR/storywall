# Accounting export — FE integration

**Audience:** the admin panel. **Backend:** `docs/accounting-export-2026-10.md`.

An admin downloads every payment and refund in a date range as a CSV for the accountant.

## Endpoint

`GET /api/admin/billing/accounting-export?from=YYYY-MM-DD&to=YYYY-MM-DD`

| | |
|---|---|
| Auth | admin bearer token; anyone else gets 403 |
| `from`, `to` | required ISO dates, **both inclusive**, read as Athens calendar days |
| Range | `to` ≥ `from`, at most 366 days; otherwise 400 `VALIDATION_FAILED` |
| Rate limit | 10 per minute per admin; 429 past that |
| 200 | `text/csv; charset=UTF-8` body, `Content-Disposition: attachment; filename="payments-<from>-to-<to>.csv"` |

The body is a file, not JSON. Fetch it as a blob and save it under the filename from
`Content-Disposition`. A plain link won't carry the bearer token.

```ts
async function downloadAccountingExport(from: string, to: string) {
  const res = await apiFetch(`/api/admin/billing/accounting-export?from=${from}&to=${to}`);
  if (!res.ok) throw await toApiError(res);
  const blob = await res.blob();
  const name = /filename="?([^"]+)"?/.exec(res.headers.get('Content-Disposition') ?? '')?.[1]
      ?? `payments-${from}-to-${to}.csv`;
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}
```

## UI suggestion

Two date pickers that default to last calendar month, and a "Download for accountant" button. Nothing is
rendered from the CSV.

The file contains buyers' names and emails. Don't cache it, and don't keep it in app state after the download.
