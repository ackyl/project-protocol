const paths = {
  ship: 'M2 13h3l3-6h7l4 3 3 5-3 2H6l-2-2H2m6 2-2 3m11-3 2 3M9 10h5',
  manifest: 'm3 7 9-4 9 4v10l-9 4-9-4zm0 0 9 4 9-4m-9 4v10m-5-16 10 4',
  hull: 'm12 2 8 3v7q0 6-8 10-8-4-8-10V5zm-4 10 3 3 5-6',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-6v6l4 2',
  route: 'M5 18V7a3 3 0 1 1 6 0v10a3 3 0 0 0 6 0V6m-3 3 3-3 3 3',
  controls: 'M3 6h18v13H3zm3 4h2m2 0h2m2 0h2m2 0h1M7 15h10',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  doc: 'M5 3h10l4 4v14H5zm9 0v5h5M8 12h8m-8 4h6',
  bolt: 'm14 2-10 12h7l-1 8 10-13h-7z',
  signal: 'M5 19v-3m5 3v-7m5 7V8m5 11V4',
  coins: 'm12 3 8 4v10l-8 4-8-4V7zm2 5h-4v8h4',
  radar: 'M3 18a13 13 0 0 1 18 0M6 14a10 10 0 0 1 12 0m-9-4a6 6 0 0 1 6 0',
  cross: 'M12 3v5m0 8v5M3 12h5m8 0h5',
}
export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof paths
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
