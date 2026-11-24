import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          hover: "hsl(var(--destructive-hover))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Semantic color extensions
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          hover: "hsl(var(--success-hover))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "var(--font-estedad)", "Estedad", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "var(--font-vazirmatn)", "Vazirmatn", "system-ui", "sans-serif"],
        persian: ["var(--font-persian)", "var(--font-vazirmatn)", "Vazirmatn", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-estedad)", "Estedad", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "var(--font-vazirmatn)", "Vazirmatn", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["clamp(2.75rem, 6.5vw, 5rem)", { lineHeight: "1.25", letterSpacing: "normal", fontWeight: "800" }],
        "display-lg": ["clamp(2.25rem, 5vw, 4rem)", { lineHeight: "1.3", letterSpacing: "normal", fontWeight: "700" }],
        "display-md": ["clamp(1.75rem, 4vw, 3rem)", { lineHeight: "1.35", letterSpacing: "normal", fontWeight: "700" }],
        "display-sm": ["clamp(1.4rem, 3vw, 2.25rem)", { lineHeight: "1.4", letterSpacing: "normal", fontWeight: "700" }],
        "heading-xl": ["clamp(1.5rem, 2.8vw, 2.1rem)", { lineHeight: "1.4", letterSpacing: "normal", fontWeight: "700" }],
        "heading-lg": ["clamp(1.35rem, 2.2vw, 1.85rem)", { lineHeight: "1.45", letterSpacing: "normal", fontWeight: "700" }],
        "heading-md": ["clamp(1.15rem, 1.8vw, 1.5rem)", { lineHeight: "1.5", letterSpacing: "normal", fontWeight: "600" }],
        "heading-sm": ["1.125rem", { lineHeight: "1.55", letterSpacing: "normal", fontWeight: "600" }],
        "body-lg": ["1.125rem", { lineHeight: "1.8" }],
        "body-md": ["1rem", { lineHeight: "1.75" }],
        "body-sm": ["0.875rem", { lineHeight: "1.65" }],
        "caption": ["0.75rem", { lineHeight: "1.6", fontWeight: "500" }],
      },
      spacing: {
        "space-xs": "var(--space-xs)",
        "space-sm": "var(--space-sm)",
        "space-md": "var(--space-md)",
        "space-lg": "var(--space-lg)",
        "space-xl": "var(--space-xl)",
        "space-2xl": "var(--space-2xl)",
        "space-3xl": "var(--space-3xl)",
        "space-4xl": "var(--space-4xl)",
        "space-5xl": "var(--space-5xl)",
      },
      boxShadow: {
        luxury: "var(--shadow-luxury-md)",
        "luxury-sm": "var(--shadow-luxury-sm)",
        "luxury-md": "var(--shadow-luxury-md)",
        "luxury-lg": "var(--shadow-luxury-lg)",
        "luxury-xl": "var(--shadow-luxury-xl)",
        "luxury-gold": "var(--shadow-luxury-gold)",
        "luxury-gold-lg": "var(--shadow-luxury-gold-lg)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "var(--shadow-luxury-gold)" },
          "50%": { boxShadow: "var(--shadow-luxury-gold-lg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-gold": "pulse-gold 3s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-pattern": "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23A16207' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config