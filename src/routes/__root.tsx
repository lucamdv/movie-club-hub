import {
  Outlet,
  Link,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      // Mobile-first viewport — prevents zoom on input focus
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { title: "MovieClub" },
      {
        name: "description",
        content: "Your cinephile social club — discover, rate & share films.",
      },
      { name: "author", content: "MovieClub" },

      // ── PWA / Android Chrome ──────────────────────────────────
      { name: "theme-color", content: "#0F1923" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "MovieClub" },

      // ── iOS Safari PWA ────────────────────────────────────────
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "MovieClub" },

      // ── OG / Twitter ──────────────────────────────────────────
      { property: "og:title", content: "MovieClub" },
      {
        property: "og:description",
        content: "Your cinephile social club — discover, rate & share films.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@MovieClub" },
      { name: "twitter:title", content: "MovieClub" },
      { name: "description", content: "Movie Club Hub is a social platform for movie lovers to discover, rate, and discuss films." },
      { property: "og:description", content: "Movie Club Hub is a social platform for movie lovers to discover, rate, and discuss films." },
      { name: "twitter:description", content: "Movie Club Hub is a social platform for movie lovers to discover, rate, and discuss films." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/hUuUvdnOXAWJWIzeF640h0uTjRi1/social-images/social-1776540434356-1000275530.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/hUuUvdnOXAWJWIzeF640h0uTjRi1/social-images/social-1776540434356-1000275530.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },

      // PWA manifest
      { rel: "manifest", href: "/manifest.json" },

      // Favicon
      { rel: "icon", href: "/favicon.ico" },

      // Apple touch icon (home-screen icon on iOS)
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },

      // iOS splash screens (optional — comment out if not needed)
      {
        rel: "apple-touch-startup-image",
        href: "/apple-touch-icon.png",
      },
    ],
    // Register service worker via inline script
    scripts: [
      {
        children: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.warn('SW registration failed:', err);
              });
            });
          }
        `,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
