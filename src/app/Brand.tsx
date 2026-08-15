type Props = { size?: number }

/** The BitKit mark. Mirrors public/favicon.svg so the two never drift apart. */
export function Logo({ size = 26 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="bitkit-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#14b39a" />
          <stop offset="100%" stopColor="#0a6154" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#bitkit-mark)" />
      <g fill="#ffffff">
        <rect x="11" y="11" width="18" height="18" rx="5" />
        <rect x="35" y="11" width="18" height="18" rx="5" opacity="0.42" />
        <rect x="11" y="35" width="18" height="18" rx="5" opacity="0.42" />
        <rect x="35" y="35" width="18" height="18" rx="5" />
      </g>
    </svg>
  )
}
