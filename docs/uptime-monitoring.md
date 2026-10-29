# Uptime monitoring

Spring can't warn anyone about its own outage, so an outside service watches it.

## Setup (Better Stack or UptimeRobot, free tier)

1. Create a monitor of type HTTP(s) for `<Spring base URL>/actuator/health`.
2. Check every 1 minute. Expect status 200 and the body to contain `"UP"`.
3. Alert after 2 failed checks in a row.
4. Alert by email to every platform admin, and turn on push in the provider's phone app.
5. Optional: a second monitor for the site's home page on Vercel.

## When it fires

Post a site notice from the admin console (Site notices → New notice, tone Critical, Everywhere).
If Spring itself is down, the app already shows the built-in outage line to anyone whose requests
fail; notices published before the outage keep showing from the cache.
