# Settings Edited on the Invite Preview (KAN-228)

**Goal:** Replace the host's Settings page (one long form with a floating Save bar) with the agreed S2 layout: the event details shown as a guest-style invite preview, each part with its own pencil that opens an editor for just that part and saves only that part.

**Mockups:** `project/S2-mobile.dc.html`, `S2-mobile-edit.dc.html`, `S2-mobile-venue.dc.html`, `S2-desktop.dc.html` on the "Host Overview redesign" canvas (claude.ai artifact `CDygEzhyHjNzSeVsrSxWXy`).

## Decisions (owner, 2026-11-18)

- **Six parts**, each with a pencil: Cover photo, Title, Date (start + end, end presets), Location (name + address + maps link), Venue (wedding/baptism only), Description. A lite event keeps only Cover, Title and Description, as today.
- **Top of the preview is always the cover photo** (or the empty "Add cover photo" box), even when a theme is set. The theme stays on the Theme page.
- **Rows show more than the guest invite:** start, then "Ends …" in grey; place name, then address in grey.
- **Venue:** "Add venue details" shows only for event types with a venue (the catalog's `secondarySessionTitleKey`), while the plan has the schedule, and only until a venue session exists. Once it exists, a venue row (title, date, place) with a pencil labelled "Edit venue details". Both open today's Schedule editor sheet (`ScheduleEditorSheet`) at every size, same fields, wording and checks.
- **Editors:** a bottom sheet on phones (`Modal variant="sheet"`), a panel beside the preview on desktop (`lg`). Heading = the part's name, fields as today, one "Save changes" button, closed with the X ("Close"). Saving sends only that part's fields (`PATCH /api/events/{id}`) and closes the editor. The edited part is outlined in the preview while its panel is open. On desktop nothing sits beside the preview until a pencil is tapped.
- **Read-only event:** today's read-only notice, no pencils. The cover pencil follows `canUploadCover` as today.

## Wording (approved 2026-11-18)

No new keys. Reused:

- Pencil labels: `ManagePage.sessionManagement.editNamed` ("Edit {title}" / "Επεξεργασία: {title}") with `ManagePage.settings.coverPhoto.label`, `useCreateEventFieldLabels` (title, startAt, locationName), `ManagePage.settings.fields.description`.
- Venue: `HostOnboarding.steps.details.venueAdd` / `venueEdit`.
- Editors: today's field labels, placeholders, hints and validation; `ManagePage.settings.save`; close label `ManagePage.rsvpReport.close`.

Removed from the page: the uppercase "Cover photo" label above the photo (it is the cover editor's heading now) and the floating "Saved" pill (the editor closes after saving). `ManagePage.settings.saved` stays (the RSVP deadline field uses it).

## Structure

- `lib/settingsPreview.ts`: part ids, which parts an event shows, each part's patch builder.
- Hooks (`hooks/`): `useSettingsEditor` (which part is open), `useSettingsTitleForm`, `useSettingsDescriptionForm`, `useSettingsScheduleForm` (today's bounds, presets, hints and errors), `useSettingsLocationForm`, `useCoverPhotoForm` (today's upload logic), `useSettingsVenue` (sessions, venue session, add/edit sheet state).
- Components (`components/manage/settings/`): `SettingsPreview`, `SettingsPreviewRow`, `SettingsPencilButton`, `SettingsCoverHero`, `SettingsVenuePart`, `SettingsPartEditor` (sheet or panel), one form per part.
- `SettingsTab.tsx` becomes a thin shell.
- Data: no new fetch. The sessions come embedded in the event detail (`useEventSessions` initialData), so the server prefetch is unchanged.
- The unused `components/manage/ManagedSessionSection.tsx` is left alone (out of scope).

## Tests

- Unit: `lib/settingsPreview.test.ts` (parts per event, patches).
- Component: `SettingsTab.test.tsx` (pencils, one part saves only its fields, lite event, read-only, venue prompt vs row).
- Stories: `SettingsPreview.stories.tsx` (wedding without venue, with venue, lite, read-only).
- Checks: `tsc --noEmit`, `eslint .`, `vitest run`; signed-in check at 375px and 1280px in English and Greek on the isolated stack, saving one part and seeing only it change.
