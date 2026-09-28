type Props = { size?: number }

/**
 * The BitKit mark: a lime tile holding a 2x2 grid of bits, two on and two
 * off. Flat colour only, so it survives a 16px favicon and a monochrome
 * launcher. Mirrors public/favicon.svg and scripts/generate-icons.mjs.
 */
export function Logo({ size = 26 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="14" fill="#c9f150" />
      <g fill="#161613">
        <rect x="12" y="12" width="17" height="17" rx="4" />
        <rect x="35" y="12" width="17" height="17" rx="4" opacity="0.22" />
        <rect x="12" y="35" width="17" height="17" rx="4" opacity="0.22" />
        <rect x="35" y="35" width="17" height="17" rx="4" />
      </g>
    </svg>
  )
}
