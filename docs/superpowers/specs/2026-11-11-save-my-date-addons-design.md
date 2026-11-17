# Selling Save my date: add-ons and a small plan (KAN-82)

Agreed with the owner on 2026-11-11. Ticket: KAN-82 (epic KAN-80), widened to cover the add-on as well as the small plan.

## What the owner decided

Save my date sells three ways:

1. **Included in a plan.** Already works (KAN-81): an admin adds the `save_my_date` module to a plan.
2. **A one-time add-on to any plan.** A `MODULE_UNLOCK` paid service, bought once.
3. **On its own, as a small plan with add-ons.** An ordinary plan whose only module is `save_my_date`. RSVP, QR cards, gallery, wishbook and so on are add-ons on it.

Further decisions:

- A **live event** can buy feature add-ons with its own one-time payment. A **draft event** adds them to the activation payment, as today.
- One payment can carry **several add-ons** (e.g. Save my date and RSVP), one receipt line each.
- Hosts buy feature add-ons in two places: the invitation's **Publish** flow, and the event's **Add-ons** page (next to storage).
- **Modules are shared.** An add-on switches on the event's one module of that kind, the same as a plan would. Save my date bought for an event whose plan has RSVP, schedule or gallery uses those; nothing is duplicated.
- **RSVP on the invitation:** Publish offers the RSVP add-on when the invitation shows an RSVP section and the event has no RSVP. If the host skips it, the published invitation hides its RSVP section.
- **Publish with an existing event** whose plan lacks Save my date shows an add-on step, which replaces the "Your plan doesn't include the invitation" dialog. When no Save my date add-on is sold for that plan, today's dialog stays.
- **Publish with a new event** lists every plan for the event type. A plan without Save my date shows its add-on line, added to the same payment.
- **The small plan** includes only Save my date by default (KAN-82 default: €49 for 6 months).
- **Prices, plans and which add-ons exist are admin data** (Plans, Paid services). No new admin screens.

## Backend (guestwall-be)

### Add-on checkout for live events

- New `OrderKind.MODULE_UNLOCK`. Migration widens the order kind check constraint; additive only.
- `POST /api/events/{eventId}/addon-checkout` with `{ paidServiceCodes: string[], consent }`, primary host only, like the storage checkout.
  - The event must be `ACTIVE`, not deleted, and have no withdrawal under review.
  - Each code must be a purchasable `MODULE_UNLOCK` for the event's plan (`requirePurchasable`), for a module the event type supports, not in the plan, not already bought, not granted by an admin. Duplicate codes are refused.
  - Price: the catalogue price of each add-on, no plan promotion or code (the storage-pack rule). Every add-on must share the currency.
- Price breakdown: one `ADDON` item per add-on, with the activation add-on's withdrawal rule (`RETAINED_ONCE_PERFORMED`, performed at the event start). The checkout footer reuses the intro, `checkout.footer.addons` and the VAT note.
- The quote endpoint accepts the same kind with `paidServiceCodes`, so the UI can show the total.
- Settlement: one `EventAddon` per item, then `EventModuleSyncService.syncToPlan`. Reversal (refund, chargeback, withdrawal) deletes those rows and syncs again.
- Withdrawal: order scope like a storage pack or extension. Refund computation follows the item rule. The notifier says "the add-ons" and "The event stays live without those features."

### Draft events

- `POST /api/events/{eventId}/addons` stays as it is.
- New `DELETE /api/events/{eventId}/addons/{paidServiceCode}`: primary host, `DRAFT` only, `MODULE_UNLOCK` only. Removes the opt-in and syncs modules. (The admin route keeps working.)

### Published invitation

- `InvitationPublicDto` gains `rsvpOpen`: whether the event's RSVP module is available now. The page hides the RSVP section when false.

## Frontend (storywall)

### Publish: existing event without Save my date

- After the host chooses an event (or Publish fails with `plan-missing`), when the event's plan offers a Save my date add-on, the publish sheet shows the add-on step:
  - Save my date, with its price ("{price} once"), always included.
  - RSVP as a checkbox, only when the invitation has a visible RSVP section, the event lacks RSVP and an RSVP add-on is offered on its plan.
  - Total, withdrawal consent, Back/Cancel, Continue to payment.
- Live event: add-on checkout. Draft event: opt into each add-on, then the activation checkout (`useDraftActivationCheckout`). Paying returns to the editor, which publishes (`useAutoPublish`).
- No Save my date add-on for that plan: today's `PublishPlanDialog`.

### Publish: new event

- `plansWithInvitation` becomes: plans that include Save my date, plus plans with a public, assignable Save my date add-on offered on them.
- A plan without Save my date shows "+ {name} · {price}" under it. RSVP is offered the same way as above.
- After creating the event: opt into the chosen add-ons, then the activation checkout, as today.

### Add-ons page

- New "Add features" section under storage: public, assignable `MODULE_UNLOCK` add-ons offered on the event's plan, for modules the plan lacks and the event doesn't already have.
- Live event: pick one or more, "Pay {amount}", add-on checkout.
- Draft event: Add / Remove per add-on, with "Paid with the plan."
- Paused while a withdrawal is under review.
- The billing tab's add-ons link shows "Manage add-ons" (existing text) when feature add-ons are on offer.

### Published invitation

- The RSVP section is hidden when `rsvpOpen` is false.

### Manage → Invitation (added 2026-11-17)

- The "Your plan doesn't include the invitation" screen (KAN-207, `useEventOnlineInvitation`'s `addOnHref`) gets a main button when a Save my date add-on is sold for the event's plan: "Add the invitation · {price}". It opens the event's Add-ons page with Save my date already ticked.
- "Upgrade plan" stays as the second button.
- When an add-on is sold, the body uses a new key: "Add it to your plan or upgrade to make an online invitation for this event." Otherwise today's body stays.

### Event creation wizard (added 2026-11-17)

- No change: the wizard's plan step (KAN-197) shows no add-on line.

### Order kind label

- `MODULE_UNLOCK`: "Add-ons" / "Πρόσθετες υπηρεσίες" wherever order kinds are labelled.

## Wording (approved 2026-11-11)

| Where | English | Greek |
| --- | --- | --- |
| Add-on step title | Add the invitation to your plan | Προσθέστε την πρόσκληση στο πλάνο σας |
| Add-on price | {price} once | {price} εφάπαξ |
| Total | Total: {amount} | Σύνολο: {amount} |
| Plan add-on line | + {name} · {price} | + {name} · {price} |
| Add-ons page title | Add features | Προσθήκη λειτουργιών |
| Pay | Pay {amount} | Πληρώστε {amount} |
| Draft add | Add | Προσθήκη |
| Draft remove | Remove | Αφαίρεση |
| Draft note | Paid with the plan. | Πληρώνεται μαζί με το πλάνο. |
| Paused | Add-ons are paused while your withdrawal is under review. | Οι πρόσθετες υπηρεσίες είναι σε παύση όσο εξετάζεται η υπαναχώρησή σας. |
| Order kind | Add-ons | Πρόσθετες υπηρεσίες |
| Manage → Invitation button (2026-11-17) | Add the invitation · {price} | Προσθήκη πρόσκλησης · {price} |
| Manage → Invitation body, add-on sold (2026-11-17) | Add it to your plan or upgrade to make an online invitation for this event. | Προσθέστε την στο πλάνο σας ή αναβαθμίστε για να φτιάξετε ηλεκτρονική πρόσκληση για αυτή την εκδήλωση. |
| Withdrawal email (English only) | …your withdrawal of the add-ons on "{event}"… The event stays live without those features. | — |

Add-on names and prices come from the admin catalogue. Any other new text found while building goes to the owner first.

## Admin setup on staging (owner)

1. Paid services → new "Unlock module" add-on: Save my date (`save_my_date`), one-time, its price, offered on every plan or chosen plans.
2. The same for RSVP and any other feature to sell (QR cards, gallery, wishbook).
3. Plans → the small plan per event type (or shared): only the Save my date module, €49 for 6 months, with the RSVP and other add-ons offered on it.

## Deploy order

Backend first (new endpoints, order kind, `rsvpOpen`), then the frontend. Everything stays behind `SAVE_MY_DATE_LAUNCHED` on production; the add-on checkout is generic but nothing sells on production until an admin creates `MODULE_UNLOCK` rows there.

## Build order (2026-11-17)

One PR at a time, each approved before the next:

1. guestwall-be: the add-on checkout, the draft add-on `DELETE`, `rsvpOpen` (migration V229).
2. storywall: the Add-ons page "Add features" section and the Manage → Invitation button.
3. storywall: Publish on an existing event, with the add-on step.
4. storywall: Publish with a new event, and the published invitation hiding RSVP.

## Tests

- Backend: checkout decisions (each refusal), breakdown items, settlement and reversal grant or remove modules, withdrawal of an add-on order, draft removal, `rsvpOpen`.
- Frontend: unit tests for the plan and add-on filters, hook tests for the add-on step and the Add-ons page section, component tests, stories for each new component and state, the published page hiding RSVP.
