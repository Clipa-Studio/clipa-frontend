import type { Metadata } from 'next'
import Providers from '../components/Providers'
import GoogleAnalytics from '../components/GoogleAnalytics'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Clipa — Easy to Record. Easy to Edit. Easy to Share.',
    template: '%s | Clipa',
  },
  description:
    'Make your videos look professional — no editing skills required. Record, edit, and share polished screen videos in minutes. Grow your audience effortlessly. Free for Mac.',
  authors: [{ name: 'Clipa' }],
  applicationName: 'Clipa',
  metadataBase: new URL('https://www.clipa.studio'),
  alternates: {
    canonical: '/',
    languages: {
      'x-default': 'https://www.clipa.studio',
    },
  },
  openGraph: {
    type: 'website',
    url: 'https://www.clipa.studio',
    title: 'Easy to Record. Easy to Edit. Easy to Share. — Clipa',
    description:
      'Make your videos look professional — no editing skills required. Record, edit, and share polished screen videos in minutes. Grow your audience effortlessly. Free for Mac.',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    siteName: 'Clipa',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Easy to Record. Easy to Edit. Easy to Share. — Clipa',
    description:
      'Make your videos look professional — no editing skills required. Record, edit, and share polished screen videos in minutes. Grow your audience effortlessly. Free for Mac.',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    other: {
      'naver-site-verification': '352ab6296c06bf11f07258b2ef6d00d7cf5385f4',
    },
  },
  icons: {
    icon: '/favicon.png',
  },
  manifest: '/manifest.json',
  other: {
    'apple-mobile-web-app-title': 'Clipa',
    'theme-color': '#5e3a91',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Clipa',
  applicationCategory: 'MultimediaApplication',
  operatingSystem: 'macOS',
  url: 'https://www.clipa.studio',
  inLanguage: ['en', 'ko'],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  description:
    'Create stunning screen recordings with automatic cursor zoom. Clipa highlights what matters, making professional tutorials effortless.',
  featureList: [
    'Auto Cursor Zoom',
    'Professional Screen Recording',
    'AI Upscale to 4K',
    'Built-in Video Editor',
    'One-click Export Presets',
  ],
}

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Clipa',
  url: 'https://www.clipa.studio',
  logo: 'https://www.clipa.studio/logo.png',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'jwjygpt0507@gmail.com',
    contactType: 'customer support',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://grkyrqhgfgthpghircbu.supabase.co" />
        <link rel="dns-prefetch" href="https://cdn.paddle.com" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                try {
                  if (l.defaultView.localStorage.getItem("clarityOptOut") === "true") return;
                } catch (e) {}

                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "wiqzi92tdx");
            `,
          }}
        />
      </head>
      <body className="grain">
        <Providers>{children}</Providers>
        <GoogleAnalytics />
      </body>
    </html>
  )
}
