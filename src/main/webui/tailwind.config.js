/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors');

module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
        './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
    ],
    prefix: "",
    theme: {
        transparent: 'transparent',
        current: 'currentColor',
        extend: {
            colors: {
                // light mode
                tremor: {
                    brand: {
                        faint: colors.blue[50],
                        muted: colors.blue[200],
                        subtle: colors.blue[400],
                        DEFAULT: colors.blue[500],
                        emphasis: colors.blue[700],
                        inverted: colors.white,
                    },
                    background: {
                        muted: colors.gray[50],
                        subtle: colors.gray[100],
                        DEFAULT: colors.white,
                        emphasis: colors.gray[700],
                    },
                    border: {
                        DEFAULT: colors.gray[200],
                    },
                    ring: {
                        DEFAULT: colors.gray[200],
                    },
                    content: {
                        subtle: colors.gray[400],
                        DEFAULT: colors.gray[500],
                        emphasis: colors.gray[700],
                        strong: colors.gray[900],
                        inverted: colors.white,
                    },
                },
                // dark mode
                'dark-tremor': {
                    brand: {
                        faint: '#0B1229',
                        muted: colors.blue[950],
                        subtle: colors.blue[800],
                        DEFAULT: colors.blue[500],
                        emphasis: colors.blue[400],
                        inverted: colors.blue[950],
                    },
                    background: {
                        muted: '#131A2B',
                        subtle: colors.gray[800],
                        DEFAULT: colors.gray[900],
                        emphasis: colors.gray[300],
                    },
                    border: {
                        DEFAULT: colors.gray[800],
                    },
                    ring: {
                        DEFAULT: colors.gray[800],
                    },
                    content: {
                        subtle: colors.gray[600],
                        DEFAULT: colors.gray[500],
                        emphasis: colors.gray[200],
                        strong: colors.gray[50],
                        inverted: colors.gray[950],
                    },
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            boxShadow: {
                // light
                'tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'tremor-card':
                    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'tremor-dropdown':
                    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                // dark
                'dark-tremor-input': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'dark-tremor-card':
                    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'dark-tremor-dropdown':
                    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
            },
            borderRadius: {
                'tremor-small': '0.375rem',
                'tremor-default': '0.5rem',
                'tremor-full': '9999px',
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            fontSize: {
                'tremor-label': ['0.75rem', {lineHeight: '1rem'}],
                'tremor-default': ['0.875rem', {lineHeight: '1.25rem'}],
                'tremor-title': ['1.125rem', {lineHeight: '1.75rem'}],
                'tremor-metric': ['1.875rem', {lineHeight: '2.25rem'}],
            },
            keyframes: {
                hide: {
                    from: {opacity: "1"},
                    to: {opacity: "0"},
                },
                slideDownAndFade: {
                    from: {opacity: "0", transform: "translateY(-6px)"},
                    to: {opacity: "1", transform: "translateY(0)"},
                },
                slideLeftAndFade: {
                    from: {opacity: "0", transform: "translateX(6px)"},
                    to: {opacity: "1", transform: "translateX(0)"},
                },
                slideUpAndFade: {
                    from: {opacity: "0", transform: "translateY(6px)"},
                    to: {opacity: "1", transform: "translateY(0)"},
                },
                slideRightAndFade: {
                    from: {opacity: "0", transform: "translateX(-6px)"},
                    to: {opacity: "1", transform: "translateX(0)"},
                },
                accordionOpen: {
                    from: {height: "0px"},
                    to: {height: "var(--radix-accordion-content-height)"},
                },
                accordionClose: {
                    from: {
                        height: "var(--radix-accordion-content-height)",
                    },
                    to: {height: "0px"},
                },
                dialogOverlayShow: {
                    from: {opacity: "0"},
                    to: {opacity: "1"},
                },
                dialogContentShow: {
                    from: {
                        opacity: "0",
                        transform: "translate(-50%, -45%) scale(0.95)",
                    },
                    to: {opacity: "1", transform: "translate(-50%, -50%) scale(1)"},
                },
                drawerSlideLeftAndFade: {
                    from: {opacity: "0", transform: "translateX(100%)"},
                    to: {opacity: "1", transform: "translateX(0)"},
                },
                drawerSlideRightAndFade: {
                    from: {opacity: "1", transform: "translateX(0)"},
                    to: {opacity: "0", transform: "translateX(100%)"},
                },
            },
            animation: {
                hide: "hide 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideDownAndFade:
                    "slideDownAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideLeftAndFade:
                    "slideLeftAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideUpAndFade: "slideUpAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                slideRightAndFade:
                    "slideRightAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                // Accordion
                accordionOpen: "accordionOpen 150ms cubic-bezier(0.87, 0, 0.13, 1)",
                accordionClose: "accordionClose 150ms cubic-bezier(0.87, 0, 0.13, 1)",
                // Dialog
                dialogOverlayShow:
                    "dialogOverlayShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                dialogContentShow:
                    "dialogContentShow 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                // Drawer
                drawerSlideLeftAndFade:
                    "drawerSlideLeftAndFade 150ms cubic-bezier(0.16, 1, 0.3, 1)",
                drawerSlideRightAndFade: "drawerSlideRightAndFade 150ms ease-in",
            },

        },
    },
    safelist: [
        {
            pattern:
                /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ['hover', 'ui-selected'],
        },
        {
            pattern:
                /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ['hover', 'ui-selected'],
        },
        {
            pattern:
                /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
            variants: ['hover', 'ui-selected'],
        },
        {
            pattern:
                /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
        {
            pattern:
                /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
        {
            pattern:
                /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
        },
    ],
    container: {
        center: true,
        padding: "2rem",
        screens: {
            "2xl": "1400px",
        },
    },
    plugins: [
        require('@headlessui/tailwindcss'),
        require('@tailwindcss/forms'),
        require("tailwindcss-animate"),
    ],
};
