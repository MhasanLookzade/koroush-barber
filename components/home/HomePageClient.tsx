"use client"

import { useState } from "react"
import { Header } from "./Header"
import { HeroSection } from "./HeroSection"
import { ServicesSection } from "./ServicesSection"
import { BeforeAfterSlider } from "./BeforeAfterSlider"
import { BookingStudio } from "./BookingStudio"
import { AboutSection } from "./AboutSection"
import { GallerySection } from "./GallerySection"
import { ReviewSystemSection } from "./ReviewSystemSection"
import { LocationContactSection } from "./LocationContactSection"
import { FaqSection } from "./FaqSection"
import { Footer } from "./Footer"
import { MobileFloatingBar } from "./MobileFloatingBar"
import { Sparkles } from "lucide-react"

export function HomePageClient() {
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>("srv-full-cut")

  const handleSelectServiceFromShowcase = (serviceId: string) => {
    setSelectedServiceId(serviceId)
  }

  return (
    <div className="min-h-screen bg-[#0D0F0E] text-[#F7F4EE] selection:bg-[#C8A96B] selection:text-[#0D0F0E]">
      {/* 1. Header Navigation */}
      <Header />

      <main id="main-content">
        {/* 2. Hero Section */}
        <HeroSection />

        {/* 3. Services Showcase (8 Services with Iranian Toman Prices) */}
        <ServicesSection onSelectService={handleSelectServiceFromShowcase} />

        {/* 4. Before & After Hairstyle Comparison Slider */}
        <section id="comparison" className="py-24 bg-[#0F1210] relative overflow-hidden" dir="rtl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#2D332F] to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181D1A] border border-[#C8A96B]/30 text-xs sm:text-sm font-semibold text-[#E4C88E]">
                <Sparkles className="w-3.5 h-3.5 text-[#C8A96B]" />
                <span>نتایج واقعی پیرایش</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-[#F7F4EE] tracking-tight">
                تغییر چهره و استایل مو قبل و بعد
              </h2>
              <p className="text-base sm:text-lg text-[#C5BDB2]">
                دسته لغزنده را به طرفین بکشید تا ظرافت فید و خط‌زنی آنکارد استاد کوروش را مقایسه کنید.
              </p>
            </div>

            <BeforeAfterSlider />
          </div>
        </section>

        {/* 5. Centerpiece: Interactive Booking Studio */}
        <BookingStudio initialServiceId={selectedServiceId} />

        {/* 6. About the Master Barber & Salon Story */}
        <AboutSection />

        {/* 7. Atmospheric Gallery */}
        <GallerySection />

        {/* 8. Customer Testimonials & Reviews */}
        <ReviewSystemSection />

        {/* 9. Location, Daily Hours (10:00-23:00) & Contact */}
        <LocationContactSection />

        {/* 10. Frequently Asked Questions */}
        <FaqSection />
      </main>

      {/* 11. Footer */}
      <Footer />

      {/* 12. Persistent Mobile Sticky Booking Bar */}
      <MobileFloatingBar />
    </div>
  )
}
