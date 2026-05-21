const APP_STORE_URL =
  process.env.NEXT_PUBLIC_APP_STORE_URL ?? "https://apps.apple.com/app/ridesa";
const GOOGLE_PLAY_URL =
  process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ?? "https://play.google.com/store/apps/details?id=co.za.ridesa";

interface AppStoreBadgesProps {
  className?: string;
  size?: "sm" | "md";
}

export function AppStoreBadges({ className = "", size = "md" }: AppStoreBadgesProps) {
  const height = size === "sm" ? "h-10" : "h-12";

  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Download on the App Store"
        className={`inline-block ${height} transition-opacity hover:opacity-90`}
      >
        <AppleStoreBadge className={`${height} w-auto`} />
      </a>
      <a
        href={GOOGLE_PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get it on Google Play"
        className={`inline-block ${height} transition-opacity hover:opacity-90`}
      >
        <GooglePlayBadge className={`${height} w-auto`} />
      </a>
    </div>
  );
}

function AppleStoreBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="135" height="40" rx="6" fill="#000" />
      <path
        d="M27.5 20.3c0-2.1 1.2-3.9 3-4.9-1.1-1.6-2.9-2.6-4.9-2.6-2.1 0-3.9 1.2-4.9 1.2-.9 0-2.4-1.1-4-1.1-3.1 0-6.2 2.6-6.2 7.5 0 1.5.3 3 .8 4.5.9 2.6 3.8 8.9 6.9 8.8 1.3 0 2.2-.9 3.8-.9 1.5 0 2.4.9 3.8.9 2.7 0 5-4.6 5.8-6.9-3.8-1.8-3.8-7.1-.1-8.5zm-2.2-6.8c1.4-1.7 1.2-4-1-5.3-1.8 1-2.9 2.9-2.5 4.7 2 .2 3.7-.8 4.5-1.4z"
        fill="#fff"
      />
      <text x="44" y="14" fill="#fff" fontSize="7" fontFamily="system-ui, sans-serif">
        Download on the
      </text>
      <text x="44" y="28" fill="#fff" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">
        App Store
      </text>
    </svg>
  );
}

function GooglePlayBadge({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 135 40" fill="none" xmlns="http://www.w3.org/2000/svg" role="img">
      <rect width="135" height="40" rx="6" fill="#000" />
      <path d="M8.5 8.2l8.8 8.8-8.8 8.8a2.2 2.2 0 01-.5-1.4V9.6a2.2 2.2 0 01.5-1.4z" fill="#4285F4" />
      <path d="M17.3 17l3.2-3.2 9.8 5.6a2.2 2.2 0 010 3.8l-9.8 5.6L17.3 17z" fill="#34A853" />
      <path d="M17.3 17L8.5 8.2a2.2 2.2 0 011.4-.5h11.6L17.3 17z" fill="#EA4335" />
      <path d="M17.3 17l3.9 3.9-3.9 3.9-3.2-3.9 3.2-3.9z" fill="#FBBC04" />
      <text x="38" y="14" fill="#fff" fontSize="7" fontFamily="system-ui, sans-serif">
        GET IT ON
      </text>
      <text x="38" y="28" fill="#fff" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif">
        Google Play
      </text>
    </svg>
  );
}
