# Optional maintenance admin

The maintenance dashboard lets an operator publish events without editing the monitor configuration or deploying again. It is **disabled by default**. Enable it only after configuring Cloudflare Access for the dashboard and its API.

## Features

- **Quick maintenance:** choose any configured service and start a 15-, 30-, 60-, or 120-minute window, or leave it open until you end it. The notice uses the selected service's name. Concurrent quick-start requests cannot create overlapping windows for that service.
- **Custom events:** choose affected services, a public title and description, an immediate or scheduled start, a duration or end time, and an alert color. Templates provide starting text for service, database, and network maintenance.
- **Event management:** extend an active timed window by 30 minutes, end an active window, or cancel an upcoming event. The dashboard shows up to 200 events, prioritizing active and upcoming entries before history.

Events use the existing D1 database. Newly loaded status pages read the latest notices; visible, already-open pages refresh them every 15 seconds. The public `/api/data` and `/api/maintenances` endpoints include current and upcoming dashboard events.

The monitoring worker reads the same events before sending downtime/recovery notifications. Notifications pause only for affected services during an active window. Checks, uptime calculations, incident recording, and existing callbacks continue. Configuration-defined events remain supported and appear as read-only entries in the dashboard.

## Enable Cloudflare Access

This setup requires a status-page hostname where you can configure Cloudflare Access, such as a custom domain on your Cloudflare account.

1. In **Zero Trust → Access controls → Applications**, create one self-hosted application with both public destinations:
   - `status.example.com/admin`
   - `status.example.com/api/admin`
2. Attach an **Allow** policy restricted to your administrators and select your identity provider. Existing GitHub, SSO, or email one-time PIN policies can be used. Keep the path-cookie setting disabled so the same session works for both paths. Choose a session duration, such as eight hours.
3. Copy your team domain (`your-team.cloudflareaccess.com`) and the application's **Application Audience (AUD) Tag** from **Configure → Additional settings**.
4. Edit `deploy/admin.json`:

   ```json
   {
     "enabled": true,
     "adminOrigin": "https://status.example.com",
     "teamDomain": "your-team.cloudflareaccess.com",
     "audience": "YOUR_APPLICATION_AUD_TAG"
   }
   ```

   Use the HTTPS origin without a path. These values are public configuration, not credentials. No Access-management API token is needed by the application.
5. Commit and deploy with the existing workflow. Terraform sets `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` on production Pages. `init.sql` adds the maintenance table without replacing monitor history. The monitoring worker is deployed with the same feature flag.
6. Visit `/admin`, sign in, and select a service to create a maintenance window. Verify that the status page shows the notice and that ending the window removes it.

Manage the Access application and its policies in Cloudflare; the deployment workflow does not create or change them. Protect only the two admin destinations if the rest of your status page should remain public. Existing whole-site `passwordProtection`, if configured, continues to apply as well.

References: [self-hosted Access applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/), [application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/), and [JWT validation and AUD tags](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## Authentication and defaults

Every admin request validates the `Cf-Access-Jwt-Assertion` signature against the team's public signing keys. It checks the issuer, application audience, expiration, and signed-in user identity. An email header, an unsigned cookie, or a token for another application cannot authenticate an admin request. A valid identity token is required even when calling a Pages alias directly. Service tokens are not supported.

Mutation requests require same-origin JSON and are limited to 16 KiB. Monitor IDs, notice text, colors, dates, and permitted event transitions are validated at the API. Sign-out uses Cloudflare's `/cdn-cgi/access/logout` endpoint.

With `enabled: false`, the admin page and API return 404, the navigation link is hidden, and maintenance reads use only configuration-defined events. The status page does not poll for dashboard events, and the worker adds no maintenance-table reads. The additive schema may still be created by a normal deployment. Re-enabling the feature restores any still-current stored events.

When enabled but misconfigured, admin requests fail closed. Preview deployments receive no Access environment variables; their admin API remains unavailable. The admin page on an alternate Pages hostname redirects to the configured canonical origin.

## Local verification

Use Node.js 22 and install dependencies in both the root and `worker` directories:

```sh
npm ci
npm ci --prefix worker
npm run test:admin
npm run lint
npm run build
npx tsc --noEmit -p worker/tsconfig.json
```

The integration suite runs real handlers and the production SQL inside Miniflare. It supplies independent monitor fixtures, an ephemeral signing key, and a mocked signing-key endpoint. Tests cover authentication failures, disabled mode without a D1 binding, input validation, concurrent quick starts, multiple monitors, public notices, scheduling, extension, cancellation, and notification suppression. Tests make no requests to production services.

For local development, initialize D1 with `npx wrangler d1 execute uptimeflare_d1 --local --file init.sql` and run `npm run dev`. `.dev.vars.example` lists the public runtime settings. Admin requests still require a valid Access-issued assertion; there is no local authentication bypass. Use a separate test Access application and protected development hostname for browser testing.

## Rollback

Roll back both Pages and the monitoring worker together. The added table can stay in D1 so event history is retained. Keep the Access protections in place while any admin API remains deployed.
