import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"
import { SkipLink, defaultSkipTargets } from "@/components/ui/skip-link"
import "./globals.css"

const estedad = localFont({
  src: [
    {
      path: "../public/fonts/estedad/Estedad-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/estedad/Estedad-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/estedad/Estedad-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/estedad/Estedad-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/estedad/Estedad-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/estedad/Estedad-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-estedad",
  display: "swap",
})

const vazirmatn = localFont({
  src: [
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/vazirmatn/Vazirmatn-Black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazirmatn",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "کوروش باربر | Kourosh Barber - رزرو نوبت آرایشگاه مردانه",
    template: "%s | کوروش باربر",
  },
  description: "آرایشگاه مردانه کوروش باربر - رزرو آنلاین نوبت، خدمات تخصصی مو و ریش، آرایشگرهای حرفه‌ای، تجربه لوکس و منحصر به فرد",
  keywords: ["آرایشگاه مردانه", "رزرو نوبت", "قص مو", "سبیل", "باربری", "کوروش باربر", "Kourosh Barber"],
  authors: [{ name: "Kourosh Barber" }],
  creator: "Kourosh Barber",
  publisher: "Kourosh Barber",
  formatDetection: { telephone: true },
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: "https://kouroshbarber.ir",
    siteName: "کوروش باربر",
    title: "کوروش باربر | Kourosh Barber - رزرو نوبت آرایشگاه مردانه",
    description: "آرایشگاه مردانه کوروش باربر - رزرو آنلاین نوبت، خدمات تخصصی مو و ریش، آرایشگرهای حرفه‌ای",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "کوروش باربر - آرایشگاه مردانه لوکس",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "کوروش باربر | Kourosh Barber",
    description: "آرایشگاه مردانه کوروش باربر - رزرو آنلاین نوبت",
    images: ["/og-image.jpg"],
    creator: "@kouroshbarber",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/site.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#0B0B0D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${estedad.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BarberShop",
              name: "کوروش باربر",
              alternateName: "Kourosh Barber",
              description: "آرایشگاه مردانه لوکس با خدمات تخصصی مو و ریش",
              url: "https://kouroshbarber.ir",
              telephone: "+98-21-8888-8888",
              address: {
                "@type": "PostalAddress",
                streetAddress: "خیابان ولیعصر، کوچه ۱۲، پلاک ۴۵",
                addressLocality: "تهران",
                addressCountry: "IR",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: 35.7219,
                longitude: 51.3347,
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  opens: "09:00",
                  closes: "21:00",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: "Sunday",
                  opens: "10:00",
                  closes: "18:00",
                },
              ],
              priceRange: "$$$",
              currenciesAccepted: "IRR",
              paymentAccepted: "Cash, Credit Card",
              areaServed: "تهران",
              hasMap: "https://maps.google.com/?q=Kourosh+Barber+Tehran",
            }),
          }}
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <SkipLink targets={defaultSkipTargets} />
        {children}
      </body>
    </html>
  )
}