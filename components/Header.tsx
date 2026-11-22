import Link from 'next/link'
import { pageConfig } from '@/uptime.config'
import { Logo } from './brand'

// The site header from the brand handbook (SiteHeader): lockup left, nav, actions right.
export default function Header({ current }: { current: 'status' | 'incidents' }) {
  const nav = [
    { key: 'status', label: 'Current status', href: '/' },
    { key: 'incidents', label: 'Incident history', href: '/incidents' },
  ]
  return (
    <header className="ct-site-header">
      <div className="ct-site-header__inner st-header">
        <Link href="/" className="ct-site-header__home st-header__home" aria-label="Cottage status, home">
          <Logo size={32} />
          <span className="st-header__tag">Status</span>
        </Link>
        <nav className="st-header__nav" aria-label="Status pages">
          {nav.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={`ct-site-header__link${current === l.key ? ' is-current' : ''}`}
              aria-current={current === l.key ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ct-site-header__actions st-header__actions">
          {(pageConfig.links || []).map((l) => (
            <a key={l.link} href={l.link} className={`ct-btn ct-btn--sm ${l.highlight ? 'ct-btn--secondary' : 'ct-btn--quiet'}`}>
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  )
}
