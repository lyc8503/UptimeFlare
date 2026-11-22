# Cottage status

The public status page for [Cottage](https://cottage.host), at **status.cottage.host**: whether the website, the dashboard and app hosting in each region are up, 90 days of history, and the incident updates and planned maintenance we post.

It's a fork of [UptimeFlare](https://github.com/lyc8503/UptimeFlare) (Apache-2.0) by lyc8503. It runs entirely on Cloudflare's free plan, with no server of ours:

- **The checks** (`worker/`, unchanged from upstream): a Cloudflare Worker runs every minute, checks each service, and stores the results in a D1 database.
- **The page** (`pages/`, `components/`, `styles/`): rewritten in Cottage's brand. The tokens, fonts and component CSS in `styles/brand/` and `public/fonts/` are copied from Hearth (`internal/web/static`), and the logo, pod row, status pill and banner are ports of the brand handbook's components. Light by default, dark when the OS asks.

Internal monitoring (servers, backups, alerts) is separate: Grafana Cloud, set up in hearth `infra/monitoring`.

## Change what's checked, or post a notice

Everything lives in [`uptime.config.ts`](uptime.config.ts):

- `workerConfig.monitors`: the services we check. Keep an `id` the same and its history stays.
- `pageConfig.group`: the sections on the page.
- `maintenances`: incident updates and planned maintenance. Colour sets what the page says about the services it lists: `red` outage, `yellow` degraded, `blue` maintenance, `green` resolved. Write them in Cottage's voice (brand handbook, Voice and copy): what happened, who it affects, what to expect next.

A push to `main` deploys (about three minutes), once deploys are switched on.

## Preview locally

```sh
npm ci
npm run dev                 # http://localhost:3000, with sample data
```

Without a D1 database, `npm run dev` shows sample data (`dev/sample.ts`). Add `?sample=outage`, `?sample=maintenance` or `?sample=empty` to see the other states. Production never uses the samples.

## Deploying (at launch)

Not deployed yet: the checks need cottage.host, app.cottage.host and a canary app to exist. At launch:

1. Put the canary app's address in the `apps-us-east` monitor.
2. Create a Cloudflare API token for the account: Workers Scripts, D1 and Cloudflare Pages edit, plus Zone DNS edit on cottage.host. Save it as the Actions secret `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID`).
3. Set the repository variable `CLOUDFLARE_DEPLOY` to `true` and run the "Deploy to Cloudflare" workflow.
4. In Cloudflare Pages, add the custom domain `status.cottage.host` to the `uptimeflare` project.
5. Link the footer status ("All systems normal") on cottage.host to it; `/api/data` returns the current state as JSON for that.

## Keeping up with upstream

```sh
git fetch upstream && git merge upstream/main
```

The worker, `types/`, `deploy/` and `deploy.tf` are upstream's, so merges there should be clean. The page itself is ours; upstream UI changes don't apply. Upstream's original README is in [UPSTREAM-README.md](UPSTREAM-README.md).

## Licence

Apache-2.0, as upstream ([LICENSE](LICENSE)). The Cottage name, logo and brand assets belong to Cottage Services LLC and aren't covered by that licence. The fonts (Fraunces, Hanken Grotesk, JetBrains Mono) are under the SIL Open Font License; see `public/fonts/OFL-*.txt`.
