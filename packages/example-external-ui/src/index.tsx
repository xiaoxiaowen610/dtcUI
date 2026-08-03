import type { CSSProperties, PropsWithChildren } from 'react'
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

export interface CardProps extends PropsWithChildren {
  tone?: 'default' | 'accent'
  'data-forge-node-id'?: string
}

export function Card({ children, tone = 'default', 'data-forge-node-id': forgeNodeId }: CardProps) {
  return (
    <article className={`externalCard externalCard--${tone}`} data-forge-node-id={forgeNodeId}>
      {children}
    </article>
  )
}

export interface HeadingProps extends PropsWithChildren {
  level?: 2 | 3
  'data-forge-node-id'?: string
}

export function Heading({ children, level = 2, 'data-forge-node-id': forgeNodeId }: HeadingProps) {
  return level === 3 ? (
    <h3 className="externalHeading" data-forge-node-id={forgeNodeId}>
      {children}
    </h3>
  ) : (
    <h2 className="externalHeading" data-forge-node-id={forgeNodeId}>
      {children}
    </h2>
  )
}

export interface TextProps extends PropsWithChildren {
  tone?: 'primary' | 'secondary'
  'data-forge-node-id'?: string
}

export function Text({ children, tone = 'primary', 'data-forge-node-id': forgeNodeId }: TextProps) {
  return (
    <p className={`externalText externalText--${tone}`} data-forge-node-id={forgeNodeId}>
      {children}
    </p>
  )
}

export interface ImageProps {
  src: string
  alt: string
  'data-forge-node-id'?: string
}

export function Image({ src, alt, 'data-forge-node-id': forgeNodeId }: ImageProps) {
  return <img alt={alt} className="externalImage" data-forge-node-id={forgeNodeId} src={src} />
}

export interface IconProps {
  name: string
  label?: string
  'data-forge-node-id'?: string
}

export function Icon({ name, label, 'data-forge-node-id': forgeNodeId }: IconProps) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className="externalIcon"
      data-forge-node-id={forgeNodeId}
      role={label ? 'img' : undefined}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

interface SectionProps {
  'data-forge-node-id'?: string
}

export interface LogoCloudProps extends SectionProps {
  headline: string
}

export function LogoCloud({ headline, 'data-forge-node-id': forgeNodeId }: LogoCloudProps) {
  return (
    <section className="marketingSection logoCloud" data-forge-node-id={forgeNodeId}>
      <p>{headline}</p>
      <div aria-label="Customer logos">Arc · Northstar · Orbit · Summit</div>
    </section>
  )
}

export interface FeatureGridProps extends SectionProps {
  title: string
  columns?: 2 | 3 | 4
}

export function FeatureGrid({
  title,
  columns = 3,
  'data-forge-node-id': forgeNodeId
}: FeatureGridProps) {
  return (
    <section className="marketingSection" data-forge-node-id={forgeNodeId}>
      <h2>{title}</h2>
      <div className="featureGrid" style={{ '--feature-columns': columns } as CSSProperties}>
        {['Map signals', 'Reuse systems', 'Validate output', 'Explain decisions'].map((feature) => (
          <article key={feature}>{feature}</article>
        ))}
      </div>
    </section>
  )
}

export interface TestimonialSectionProps extends SectionProps {
  quote: string
  author: string
}

export function TestimonialSection({
  quote,
  author,
  'data-forge-node-id': forgeNodeId
}: TestimonialSectionProps) {
  return (
    <section className="marketingSection testimonial" data-forge-node-id={forgeNodeId}>
      <blockquote>{quote}</blockquote>
      <cite>{author}</cite>
    </section>
  )
}

export interface CtaSectionProps extends SectionProps {
  title: string
  actionLabel: string
  href: string
}

export function CtaSection({
  title,
  actionLabel,
  href,
  'data-forge-node-id': forgeNodeId
}: CtaSectionProps) {
  return (
    <section className="marketingSection ctaSection" data-forge-node-id={forgeNodeId}>
      <h2>{title}</h2>
      <Button href={href}>{actionLabel}</Button>
    </section>
  )
}
