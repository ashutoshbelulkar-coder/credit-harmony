import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
      laptop: "1200px",
      desktop: "1440px",
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontSize: {
      xs: ["9px", { lineHeight: "12px" }],
      sm: ["0.7rem", { lineHeight: "1rem" }],
      base: ["0.8rem", { lineHeight: "1.2rem" }],
      lg: ["0.9rem", { lineHeight: "1.4rem" }],
      xl: ["1rem", { lineHeight: "1.4rem" }],
      "2xl": ["1.2rem", { lineHeight: "1.6rem" }],
      "3xl": ["1.5rem", { lineHeight: "1.8rem" }],
      "4xl": ["1.8rem", { lineHeight: "2rem" }],
      "5xl": ["2.4rem", { lineHeight: "1" }],
      "6xl": ["3rem", { lineHeight: "1" }],
      "7xl": ["3.6rem", { lineHeight: "1" }],
      "8xl": ["4.8rem", { lineHeight: "1" }],
      "9xl": ["6.4rem", { lineHeight: "1" }],
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["26px", { lineHeight: "32px" }],
        h1: ["22px", { lineHeight: "29px" }],
        h2: ["19px", { lineHeight: "26px" }],
        h3: ["16px", { lineHeight: "22px" }],
        h4: ["14px", { lineHeight: "21px" }],
        body: ["11px", { lineHeight: "18px" }],
        "body-dense": ["10px", { lineHeight: "16px" }],
        caption: ["10px", { lineHeight: "14px" }],
        label: ["10px", { lineHeight: "13px" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          subtle: "hsl(var(--primary-subtle))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        danger: {
          DEFAULT: "hsl(var(--danger))",
          foreground: "hsl(var(--danger-foreground))",
          light: "hsl(var(--danger-light))",
          subtle: "hsl(var(--danger-subtle))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          light: "hsl(var(--accent-light))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
          subtle: "hsl(var(--success-subtle))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
          subtle: "hsl(var(--warning-subtle))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          light: "hsl(var(--info-light))",
          subtle: "hsl(var(--info-subtle))",
        },
        "crif-orange": {
          DEFAULT: "hsl(var(--crif-orange))",
          foreground: "hsl(var(--crif-orange-foreground))",
        },
        "crif-light-gray": "hsl(var(--crif-light-gray))",
        "crif-green-yellow": "hsl(var(--crif-green-yellow))",
        /** credit domain risk severity — distinct from UI state tokens */
        risk: {
          high: "hsl(var(--risk-high))",
          "high-foreground": "hsl(var(--risk-high-foreground))",
          "high-subtle": "hsl(var(--risk-high-subtle))",
          medium: "hsl(var(--risk-medium))",
          "medium-foreground": "hsl(var(--risk-medium-foreground))",
          "medium-subtle": "hsl(var(--risk-medium-subtle))",
          low: "hsl(var(--risk-low))",
          "low-foreground": "hsl(var(--risk-low-foreground))",
          "low-subtle": "hsl(var(--risk-low-subtle))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
          "7": "hsl(var(--chart-7))",
        },
        badge: {
          sandbox: "hsl(var(--badge-sandbox))",
          uat: "hsl(var(--badge-uat))",
          prod: "hsl(var(--badge-prod))",
        },
        "header-bg": "hsl(var(--header-bg))",
        "header-border": "hsl(var(--header-border))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        "compact-xs": "0.1875rem",
        "compact-sm": "0.375rem",
        "compact-md": "0.8rem",
        "compact-lg": "1.275rem",
      },
      /** Semantic elevation system — use instead of arbitrary rgba shadow values.
       *  shadow-sm → list items, table rows, inline chips
       *  shadow-md → page cards, panels, section containers, stat tiles
       *  shadow-lg → modals, drawers, command palette, floating dropdowns */
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
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
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
