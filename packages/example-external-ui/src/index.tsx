import type { PropsWithChildren } from 'react'
import './styles.css'

export interface ButtonProps extends PropsWithChildren {
  variant?: 'primary' | 'secondary'
  href?: string
  'data-forge-node-id'?: string
}

export function Button({
  children,
  variant = 'primary',
  href,
  'data-forge-node-id': forgeNodeId
}: ButtonProps) {
  const className = `externalButton externalButton--${variant}`

  if (href) {
    return (
      <a className={className} data-forge-node-id={forgeNodeId} href={href}>
        {children}
      </a>
    )
  }

  return (
    <button className={className} data-forge-node-id={forgeNodeId} type="button">
      {children}
    </button>
  )
}

export interface BadgeProps extends PropsWithChildren {
  'data-forge-node-id'?: string
}

export function Badge({ children, 'data-forge-node-id': forgeNodeId }: BadgeProps) {
  return (
    <span className="externalBadge" data-forge-node-id={forgeNodeId}>
      {children}
    </span>
  )
}

export interface ProductPreviewProps {
  'data-forge-node-id'?: string
}

export function ProductPreview({ 'data-forge-node-id': forgeNodeId }: ProductPreviewProps) {
  return (
    <div
      aria-label="Product analytics dashboard preview"
      className="productPreview"
      data-forge-node-id={forgeNodeId}
      role="img"
    >
      <div className="productPreview__chrome">
        <span />
        <span />
        <span />
      </div>
      <div className="productPreview__body">
        <aside className="productPreview__rail">
          <i className="productPreview__logo" />
          {Array.from({ length: 5 }, (_, index) => (
            <i key={index} />
          ))}
        </aside>
        <div className="productPreview__canvas">
          <header>
            <div>
              <small>Workspace overview</small>
              <strong>Signal dashboard</strong>
            </div>
            <span>Live</span>
          </header>
          <div className="productPreview__metrics">
            <article>
              <small>Automations</small>
              <strong>1,284</strong>
              <em>+18.4%</em>
            </article>
            <article>
              <small>Time saved</small>
              <strong>248h</strong>
              <em>+9.7%</em>
            </article>
          </div>
          <div className="productPreview__chart">
            {[42, 61, 49, 76, 58, 88, 72, 95].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
