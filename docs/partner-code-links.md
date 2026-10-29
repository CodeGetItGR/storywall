# Partner code links

A partner (an invitation shop, a venue, a planner) can share a link that carries their discount code.
A visitor who follows it finds the code already filled in and applied at the activation checkout:
there's nothing to copy or type.

```
https://storywall.gr/weddings?promo=CARDS10&utm_source=cards-shop&utm_medium=referral
```

| Part | What it does |
| --- | --- |
| `promo` | The collaboration code, exactly as created in the admin. Letters, digits and `-`, at most 40 characters (Spring's `CollaborationCodeRequestDto` rule). Anything else is ignored. |
| `utm_*` | Optional. Signup source tracking saves them with the new account, so admins can count sign-ups per partner. |

Any page works: a landing page, `/register` or an app page.

## How the code travels

The landing pages → sign-up → email verification → create event → checkout path has several full page
loads, and email verification may happen in another tab. Page memory can't carry the code through
that, so it is kept in local storage (`storywall.partnerCode`) for 30 days.

- `usePartnerCodeLink` (mounted in both `PublicProviders` and `AppProviders`) saves the code from any page
  and removes `promo` from the address bar. The newest link wins.
- `CollaborationCodeSection` opens with the saved code and applies it once checkout is enabled. The host
  sees it in the field and the discount line, as if they had typed it.
- The code is forgotten when the host closes the code field, or when the backend refuses it (5060). A
  refused code stays on screen with its error once, then doesn't come back.
- A code applied at one checkout stays saved until it expires, so a second event within 30 days gets the
  same offer. The code still binds to the event at checkout, as usual.

## Why no consent

The visitor followed the link to get the discount and sees the code at checkout, so the storage is part
of the feature they asked for, not analytics. It's still a new local storage item, so the Cookie Policy's
§5 list needs a line for it before release (a policies-only legal version; Terms don't change).

## Not covered

- The `?code=` param on `/events/{id}/checkout/review` is something else (the checkout return). That's
  why the param is `promo`.
- Nothing is sent to the backend until the host reaches checkout, and nothing changes in the backend.
