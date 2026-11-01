# Event vendor settings and the admin audit log — design

Date: 2026-11-01
Status: approved
Scope: per-event vendor settings in the admin console (event page and provisioning), a control for every plan module setting instead of JSON, and an Audit log in the admin console. Builds on [Vendors in the event](2026-10-19-vendors-in-the-event-design.md). Backend: guestwall-be migration `V197__event_module_config_value_overrides.sql`.

## Goal

An admin can give one event its own vendor settings (for example, only 1 vendor), on the event's admin page or while provisioning it, without changing the plan. Every setting in the plan grid has its own control. Every admin action is logged and readable in the console.

## Decisions

| Topic | Decision |
| --- | --- |
| Which settings | The four vendors settings: Max vendors, Vendor types, Tool days after the event, Pro storage. |
| How they apply | An exact value for the event that replaces the plan's. It can be lower than the plan's (0 vendors and no types are allowed). A later plan change doesn't move it. |
| Other settings | Unchanged: caps take an extra on top of the plan's, flags are on, off or the plan's. |
| Module not on the plan | Setting a vendors value for an event whose plan lacks vendors turns vendors on for that event only (recorded as a module grant), with a warning in the drawer and on review. The plan doesn't change. Putting the plan's value back leaves the module on. |
| Provisioning | An optional, collapsed "Vendor settings" section on every plan whose event type supports vendors. It starts from the plan's settings (or the event type's default when the plan has none). Only the changed settings are sent, with the event, in one request (`moduleConfigs`). Review lists them. |
| Plan grid | The Advanced JSON field is gone. Vendor types are checkboxes; numbers and storage have their own inputs. Keys without a control are kept as they are when saving. Cells list each setting in words. |
| Migration | `vendors.maxVendors` overrides saved as an extra become exact values: the plan's cap plus the extra, so no event loses vendors. |
| Audit log | A new "Audit log" section under Operations: a table (when, admin, action, details, event), filters by admin and event (picked from a row, or an event id pasted) and by action, and a drawer with the reason, who and when, and every detail. Each event's admin page has a "History" list of its own entries. |
| What is logged | Every admin action the server records, including setting and resetting an event's setting, provisioning (with its settings), and plan module and plan setting changes. Each entry keeps the admin, the reason where one is asked, and the before and after values. |

## API

- `PUT /api/admin/events/{eventId}/module-configs`: a `VALUE` setting takes `value` (a number or a list of vendor types) instead of `extra` or `enabled`.
- `AdminEventModuleConfig.kind` gains `VALUE`; `override.value` holds the event's own value.
- `POST` provision: optional `moduleConfigs: { moduleKey, configKey, value }[]`.
- `GET /api/admin/audit-log?page&size&adminUserId&eventId&action`: entries gain `adminEmail` and `adminName`.

## Known limits

- The provision response returns the event as it was before its settings were applied. The success screen only shows the title and id, and the event page loads the event again, so nothing shows the stale values.
