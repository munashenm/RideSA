import { AppStoreBadges } from "@/components/AppStoreBadges";

export function SiteFooter() {
  return (
    <footer className="border-t bg-white mt-auto pb-20 lg:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="font-semibold text-gray-800 mb-1">RideSA</p>
        <p className="text-sm text-muted mb-6">
          Planned intercity travel &amp; parcel sharing across South Africa
        </p>

        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Get the app
          </p>
          <AppStoreBadges />
        </div>
        <p className="text-xs text-muted mt-3">
          Available on the App Store and Google Play
        </p>

        <p className="text-sm text-muted mt-6">
          &copy; {new Date().getFullYear()} RideSA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
