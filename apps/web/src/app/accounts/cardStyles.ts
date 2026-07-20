/**
 * Card face style definitions for auto-detecting card art from institution names.
 * Purely presentational — no backend storage needed.
 */

export interface CardFaceStyle {
  /** Human-readable label */
  label: string;
  /** Primary gradient color */
  primary: string;
  /** Secondary gradient color */
  secondary: string;
  /** Accent color for highlights */
  accent: string;
  /** Text color on the card */
  textColor: string;
  /** Brand icon / initial shown on the card */
  initial: string;
  /** Optional real card face image URL — when set, rendered instead of gradient */
  cardImageUrl?: string;
}

const DEFAULT_CARD_STYLE: CardFaceStyle = {
  label: "Generic",
  primary: "#1a1a2e",
  secondary: "#16213e",
  accent: "#0f3460",
  textColor: "#ffffff",
  initial: "C"
};

const CARD_STYLE_REGISTRY: Array<{ patterns: RegExp[]; style: CardFaceStyle }> = [
  {
    patterns: [/discover/i],
    style: {
      label: "Discover",
      primary: "#e97300",
      secondary: "#ff6600",
      accent: "#ff8c00",
      textColor: "#ffffff",
      initial: "D"
    }
  },
  {
    patterns: [/chase/i, /jp[\s_]?morgan/i],
    style: {
      label: "Chase",
      primary: "#1a3e6f",
      secondary: "#00509e",
      accent: "#0f7dc2",
      textColor: "#ffffff",
      initial: "C",
      cardImageUrl: "https://media.chase.com/content/dam/chase/media-center/pr/card-sapphire-preferred.png"
    }
  },
  {
    patterns: [/american express/i, /amex/i, /axp/i],
    style: {
      label: "American Express",
      primary: "#002663",
      secondary: "#016fd0",
      accent: "#6cb4ee",
      textColor: "#ffffff",
      initial: "A",
      cardImageUrl: "https://icm.aexp-static.com/acquisition/card-art/NUS000000174_480x304_straight_withname.png"
    }
  },
  {
    patterns: [/capital one/i, /capitale?one/i],
    style: {
      label: "Capital One",
      primary: "#004977",
      secondary: "#9e2a2b",
      accent: "#d0302a",
      textColor: "#ffffff",
      initial: "C",
      cardImageUrl: "https://ecm.capitalone.com/WCM/card/products/venturex-cg-static-card-1000x630-2.png"
    }
  },
  {
    patterns: [/citi/i, /citibank/i],
    style: {
      label: "Citi",
      primary: "#003764",
      secondary: "#0066ae",
      accent: "#00aeef",
      textColor: "#ffffff",
      initial: "C"
    }
  },
  {
    patterns: [/wells fargo/i, /wells/i],
    style: {
      label: "Wells Fargo",
      primary: "#b31b1b",
      secondary: "#d41111",
      accent: "#f4a100",
      textColor: "#ffffff",
      initial: "W"
    }
  },
  {
    patterns: [/bank of america/i, /bofa/i, /b\.?o\.?a\.?/i],
    style: {
      label: "Bank of America",
      primary: "#012169",
      secondary: "#e31837",
      accent: "#fedb00",
      textColor: "#ffffff",
      initial: "B"
    }
  },
  {
    patterns: [/us[\s_]?bank/i],
    style: {
      label: "U.S. Bank",
      primary: "#0a2240",
      secondary: "#003087",
      accent: "#0072ce",
      textColor: "#ffffff",
      initial: "U"
    }
  },
  {
    patterns: [/barclays/i],
    style: {
      label: "Barclays",
      primary: "#00aeef",
      secondary: "#003764",
      accent: "#ffffff",
      textColor: "#ffffff",
      initial: "B"
    }
  },
  {
    patterns: [/hsbc/i],
    style: {
      label: "HSBC",
      primary: "#db0011",
      secondary: "#333333",
      accent: "#ffffff",
      textColor: "#ffffff",
      initial: "H"
    }
  },
  {
    patterns: [/apple/i],
    style: {
      label: "Apple Card",
      primary: "#1c1c1e",
      secondary: "#2c2c2e",
      accent: "#f5f5f7",
      textColor: "#ffffff",
      initial: ""
    }
  },
  {
    patterns: [/paypal/i, /venmo/i],
    style: {
      label: "PayPal",
      primary: "#003087",
      secondary: "#009cde",
      accent: "#012169",
      textColor: "#ffffff",
      initial: "P"
    }
  },
  {
    patterns: [/visa/i],
    style: {
      label: "Visa",
      primary: "#1a1f71",
      secondary: "#f7a600",
      accent: "#ffffff",
      textColor: "#ffffff",
      initial: "V"
    }
  },
  {
    patterns: [/mastercard/i, /mc/i],
    style: {
      label: "Mastercard",
      primary: "#000000",
      secondary: "#f79e1b",
      accent: "#eb001b",
      textColor: "#ffffff",
      initial: "M"
    }
  }
];

const ACCOUNT_TYPE_CARD_STYLES: Record<string, CardFaceStyle> = {
  credit: {
    label: "Credit Card",
    primary: "#2d3436",
    secondary: "#636e72",
    accent: "#0984e3",
    textColor: "#ffffff",
    initial: "C"
  },
  checking: {
    label: "Checking",
    primary: "#0652DD",
    secondary: "#1B1464",
    accent: "#1289A7",
    textColor: "#ffffff",
    initial: "C"
  },
  savings: {
    label: "Savings",
    primary: "#006266",
    secondary: "#009432",
    accent: "#A3CB38",
    textColor: "#ffffff",
    initial: "S"
  },
  depository: {
    label: "Depository",
    primary: "#5758BB",
    secondary: "#6F1E51",
    accent: "#B53471",
    textColor: "#ffffff",
    initial: "D"
  },
  investment: {
    label: "Investment",
    primary: "#1B1464",
    secondary: "#0652DD",
    accent: "#12CBC4",
    textColor: "#ffffff",
    initial: "I"
  },
  loan: {
    label: "Loan",
    primary: "#4a235a",
    secondary: "#7d3c98",
    accent: "#d2b4de",
    textColor: "#ffffff",
    initial: "L"
  },
  cash: {
    label: "Cash",
    primary: "#1e8449",
    secondary: "#27ae60",
    accent: "#82e0aa",
    textColor: "#ffffff",
    initial: "$"
  }
};

/**
 * Infer the card face style from source institution and account type.
 */
export function inferCardFaceStyle(
  sourceInstitution: string | null,
  accountType: string
): CardFaceStyle {
  if (sourceInstitution) {
    for (const entry of CARD_STYLE_REGISTRY) {
      for (const pattern of entry.patterns) {
        if (pattern.test(sourceInstitution)) {
          return entry.style;
        }
      }
    }
  }

  const normalizedType = accountType.trim().toLowerCase();
  return ACCOUNT_TYPE_CARD_STYLES[normalizedType] || DEFAULT_CARD_STYLE;
}
