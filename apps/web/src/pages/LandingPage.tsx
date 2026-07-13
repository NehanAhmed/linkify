import Navbar from "@/components/landing/Navbar"
import HeroSection from "@/components/landing/HeroSection"
import FeatureGrid from "@/components/landing/FeatureGrid"
import StatsSection from "@/components/landing/StatsSection"
import TestimonialsSection from "@/components/landing/TestimonialsSection"
import PricingPreview from "@/components/landing/PricingPreview"
import FAQSection from "@/components/landing/FAQSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <HeroSection />
        <FeatureGrid />
        <StatsSection />
        <TestimonialsSection />
        <PricingPreview />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
