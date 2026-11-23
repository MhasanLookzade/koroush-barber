import { Metadata } from "next"
import { HomePageClient } from "@/components/home/HomePageClient"

export const metadata: Metadata = {
  title: "آرایشگاه کوروش | Koroush Barber — رزرو نوبت پیرایش مردانه لوکس در تهران",
  description:
    "آرایشگاه کوروش، سالن اختصاصی پیرایش و استایل آقایان در تهران. نوبت‌های ۶۰ دقیقه‌ای اختصاصی، ساعت کاری ۱۰:۰۰ الی ۲۳:۰۰، رزرو آنلاین آسان با بیعانه شفاف ۲۰٪ و استایل تضمین‌شده.",
  openGraph: {
    title: "آرایشگاه کوروش | Koroush Barber",
    description: "استایل حرفه‌ای، دقیقاً سر وقت شما. رزرو آنلاین نوبت پیرایش ۶۰ دقیقه‌ای در محیطی آرام و مدرن.",
    url: "https://koroushbarber.ir",
    siteName: "آرایشگاه کوروش",
    locale: "fa_IR",
    type: "website",
  },
}

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: "آرایشگاه کوروش | Koroush Barber",
    image: "https://koroushbarber.ir/images/salon-hero.svg",
    telephone: "+98-21-22446688",
    priceRange: "۲۰۰,۰۰۰ تومان - ۱,۳۰۰,۰۰۰ تومان",
    address: {
      "@type": "PostalAddress",
      streetAddress: "خیابان مقدس اردبیلی، مجتمع تجاری پیروز، طبقه ۲، واحد ۲۰۴",
      addressLocality: "تهران",
      addressRegion: "تهران",
      addressCountry: "IR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 35.7981,
      longitude: 51.4182,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: "10:00",
        closes: "23:00",
      },
    ],
    url: "https://koroushbarber.ir",
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomePageClient />
    </>
  )
}
