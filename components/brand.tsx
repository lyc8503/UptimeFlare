// Cottage brand components, ported from the brand handbook's components/bundle.js so they match
// the app exactly. Styles: styles/brand/bundle.css (copied verbatim from Hearth).
import type { ReactNode } from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

function Mark({ size, mono }: { size: number; mono?: boolean }) {
  const cls = cx('ct-logo__mark', mono && 'ct-logo__mark--mono')
  if (size <= 24) {
    return (
      <svg className={cls} viewBox="0 0 16 16" width={size} height={size} aria-hidden focusable="false">
        <path className="ct-logo__roof" d="M1.75 7.25 8 2.5l6.25 4.75" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <rect className="ct-logo__pod" x={1} y={9.5} width={4} height={5.5} rx={1} />
        <rect className="ct-logo__pod ct-logo__pod--lit" x={6} y={9.5} width={4} height={5.5} rx={1} />
        <rect className="ct-logo__pod" x={11} y={9.5} width={4} height={5.5} rx={1} />
      </svg>
    )
  }
  return (
    <svg className={cls} viewBox="0 0 64 64" width={size} height={size} aria-hidden focusable="false">
      <rect className="ct-logo__pod" x={43} y={7} width={8} height={19} rx={2} />
      <path className="ct-logo__roof" d="M8 31 32 13 56 31" fill="none" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
      <rect className="ct-logo__pod" x={5} y={40} width={14} height={17} rx={3.5} />
      <rect className="ct-logo__pod ct-logo__pod--lit" x={25} y={40} width={14} height={17} rx={3.5} />
      <rect className="ct-logo__pod" x={45} y={40} width={14} height={17} rx={3.5} />
    </svg>
  )
}

export function Logo({
  variant = 'lockup',
  size = 32,
  label = 'Cottage',
}: {
  variant?: 'lockup' | 'mark' | 'mono'
  size?: number
  label?: string
}) {
  if (variant !== 'lockup') {
    return (
      <span className="ct-logo" role="img" aria-label={label}>
        <Mark size={size} mono={variant === 'mono'} />
      </span>
    )
  }
  return (
    <span className="ct-logo ct-logo--lockup" role="img" aria-label={label} style={{ gap: Math.round(size * 0.22) }}>
      <Mark size={size} />
      <span className="ct-logo__word" style={{ fontSize: Math.round(size * 0.79) }} aria-hidden>
        cottage
      </span>
    </span>
  )
}

export function PodRow({
  count = 5,
  lit,
  size = 32,
  roof = false,
  empty = false,
}: {
  count?: number
  lit?: number
  size?: number
  roof?: boolean
  empty?: boolean
}) {
  const litIdx = lit == null ? Math.floor(count / 2) : lit
  const W = count * 20 - 6
  const pad = 4
  const rise = roof ? Math.min(0.75 * (W / 2 - 3), 18) : 0
  const podTop = roof ? 9 + rise + 8 : pad
  const vbW = W + pad * 2
  const vbH = podTop + 17 + pad
  const eave = podTop - 9
  return (
    <svg className="ct-podrow" viewBox={`0 0 ${vbW} ${vbH}`} height={size} width={Math.round((size * vbW) / vbH)} aria-hidden>
      {roof && (
        <path
          className="ct-podrow__roof"
          d={`M${pad + 3} ${eave} ${pad + W / 2} ${eave - rise} ${pad + W - 3} ${eave}`}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {Array.from({ length: count }, (_, i) => {
        const state = i === litIdx ? 'lit' : empty ? 'empty' : 'full'
        const e = state === 'empty'
        return (
          <rect
            key={i}
            className={`ct-pod ct-pod--${state}`}
            x={pad + i * 20 + (e ? 0.75 : 0)}
            y={podTop + (e ? 0.75 : 0)}
            width={e ? 12.5 : 14}
            height={e ? 15.5 : 17}
            rx={3.5}
          />
        )
      })}
    </svg>
  )
}

export type Shape = 'dot' | 'ring' | 'spin' | 'pause' | 'tri'

export function StatusIcon({ shape }: { shape: Shape }) {
  if (shape === 'dot')
    return (
      <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
        <circle cx={6} cy={6} r={4} fill="currentColor" />
      </svg>
    )
  if (shape === 'ring')
    return (
      <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
        <circle cx={6} cy={6} r={3.75} fill="none" stroke="currentColor" strokeWidth={1.75} />
      </svg>
    )
  if (shape === 'spin')
    return (
      <svg viewBox="0 0 12 12" width={10} height={10} className="ct-spin" aria-hidden>
        <path d="M6 1.5a4.5 4.5 0 1 1-4.5 4.5" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
      </svg>
    )
  if (shape === 'pause')
    return (
      <svg viewBox="0 0 12 12" width={10} height={10} aria-hidden>
        <rect x={2.5} y={2} width={2.5} height={8} rx={0.75} fill="currentColor" />
        <rect x={7} y={2} width={2.5} height={8} rx={0.75} fill="currentColor" />
      </svg>
    )
  return (
    <svg viewBox="0 0 12 12" width={11} height={11} aria-hidden>
      <path d="M6 1.2 11 10.5H1Z" fill="currentColor" />
      <rect x={5.3} y={4.4} width={1.4} height={3.2} rx={0.5} fill="var(--paper-raised)" />
      <rect x={5.3} y={8.3} width={1.4} height={1.3} rx={0.5} fill="var(--paper-raised)" />
    </svg>
  )
}

const STATUS = {
  operational: { label: 'Operational', tone: 'success', shape: 'dot' },
  degraded: { label: 'Degraded', tone: 'warning', shape: 'tri' },
  maintenance: { label: 'Maintenance', tone: 'warning', shape: 'spin' },
  outage: { label: 'Outage', tone: 'danger', shape: 'tri' },
  unknown: { label: 'No data', tone: 'neutral', shape: 'ring' },
} as const

export function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  return (
    <span className={`ct-pill ct-pill--${s.tone}`}>
      <StatusIcon shape={s.shape} />
      {s.label}
    </span>
  )
}

const BANNER_ICON = {
  info: 'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 6.5v5M10 6.5v.5',
  success: 'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM6.8 10.2l2.2 2.2 4.2-4.6',
  warning: 'M10 3 18 16.5H2ZM10 8.2v3.6M10 14v.3',
  danger: 'M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4',
}

export function Banner({
  tone = 'info',
  title,
  children,
  aside,
}: {
  tone?: keyof typeof BANNER_ICON
  title?: ReactNode
  children?: ReactNode
  aside?: ReactNode
}) {
  return (
    <div className={`ct-banner ct-banner--${tone}`} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      <svg className="ct-banner__icon" viewBox="0 0 20 20" width={20} height={20} aria-hidden>
        <path d={BANNER_ICON[tone]} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="ct-banner__body">
        {title && <p className="ct-banner__title">{title}</p>}
        {children && <div className="ct-banner__text">{children}</div>}
      </div>
      {aside && <div className="ct-banner__action">{aside}</div>}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="ct-empty">
      <PodRow count={3} roof empty lit={-1} size={48} />
      <h2 className="ct-empty__title">{title}</h2>
      {children && <p className="ct-empty__text">{children}</p>}
    </section>
  )
}
