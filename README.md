# 📈UptimeFlare

A more advanced, serverless, and free uptime monitoring & status page solution, powered by Cloudflare Workers, complete with a user-friendly interface.

## ⭐Features
- Open-source, easy to deploy (in under 10 minutes, no local tools required), and free
- Monitoring capabilities
  - Up to 50 checks at 1-minute intervals
  - Geo-specific checks from over [310 cities](https://www.cloudflare.com/network/) worldwide
  - Support for HTTP/HTTPS/TCP port monitoring
  - Up to 90-day uptime history and uptime percentage tracking
  - Customizable request methods, headers, and body for HTTP(s)
  - Custom status code & keyword checks for HTTP(s)
  - Customizable Webhook
- Status page
  - Interactive ping (response time) chart for all types of monitors
  - Responsive UI that adapts to your system theme
  - Customizable status page
  - Use your own domain with CNAME

## 👀Demo

My status page (Online demo): https://uptimeflare.pages.dev/

Some screenshots:

![Desktop, Light theme](docs/desktop.png)

## ⚡Quickstart / 📄Documentation

Please refer to [Quickstart](https://github.com/lyc8503/UptimeFlare/wiki/Quickstart) and [Wiki](https://github.com/lyc8503/UptimeFlare/wiki)

## TODOs

- [x] TCP `opened` promise
- [x] ~~SSL certificate checks~~
- [x] Telegram example
- [x] [Bark](https://bark.day.app) example
- [ ] Slack example
- [ ] Incident timeline
- [x] ~~Email notification via Cloudflare Email Workers~~
- [x] Specify region for monitors
