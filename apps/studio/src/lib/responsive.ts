import type { Device } from '../stores/workspace'
import type { LayoutSpec, ResponsiveSpec } from '@forge-ui/contracts'

const mobileFirstOrder: Record<Device, Array<keyof NonNullable<ResponsiveSpec['layout']>>> = {
  mobile: ['mobile'],
  tablet: ['mobile', 'tablet'],
  desktop: ['mobile', 'tablet', 'desktop']
}

export function resolveResponsiveLayout(
  base: LayoutSpec | undefined,
  responsive: ResponsiveSpec | undefined,
  device: Device
): LayoutSpec {
  return mobileFirstOrder[device].reduce<LayoutSpec>(
    (resolved, breakpoint) => ({ ...resolved, ...(responsive?.layout?.[breakpoint] ?? {}) }),
    { ...(base ?? {}) }
  )
}

export function resolveResponsiveVisibility(
  responsive: ResponsiveSpec | undefined,
  device: Device
): boolean {
  return responsive?.visibility?.[device] ?? true
}
