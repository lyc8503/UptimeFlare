import { Logo } from './brand'

// The site footer from the brand handbook, trimmed for a single-purpose page.
export default function Footer() {
  return (
    <footer className="st-footer">
      <div className="st-container st-container--narrow">
        <div className="st-footer__top">
          <a href="https://cottage.host" className="st-footer__brand" aria-label="Cottage home">
            <Logo variant="mono" size={32} />
          </a>
          <p className="st-footer__about">
            Cottage runs open-source apps for you, kept warm. This page checks our services every
            minute from Cloudflare&rsquo;s network.
          </p>
        </div>
        <div className="st-footer__bottom">
          <span>&copy; {new Date().getFullYear()} Cottage Host</span>
          <a href="https://cottage.host">cottage.host</a>
          {/* an API route, not a page */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/data">Status API</a>
          <span>
            Built on{' '}
            <a href="https://github.com/lyc8503/UptimeFlare">UptimeFlare</a>, open source (
            <a href="https://github.com/cottage-host/status">our copy</a>)
          </span>
        </div>
      </div>
    </footer>
  )
}
