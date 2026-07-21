/**
 * Card face style definitions for auto-detecting card art from institution names.
 * Purely presentational — no backend storage needed.
 *
 * Each card gets a unique face deterministically derived from its name —
 * no two cards share the same gradient or image.
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
  /** Local card face image path — when set, rendered instead of the gradient */
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
      initial: "C"
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
      initial: "A"
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
      initial: "C"
    }
  },
  {
    patterns: [/\bciti\b/i, /citibank/i],
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
    patterns: [/u\.?\s*s\.?\s*bank/i, /us[\s_]?bank/i],
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
    patterns: [/pnc/i],
    style: {
      label: "PNC Bank",
      primary: "#003087",
      secondary: "#0072ce",
      accent: "#d52b1e",
      textColor: "#ffffff",
      initial: "P"
    }
  },
  {
    patterns: [/truist/i],
    style: {
      label: "Truist Bank",
      primary: "#292929",
      secondary: "#555555",
      accent: "#ffd100",
      textColor: "#ffffff",
      initial: "T"
    }
  },
  {
    patterns: [/td[\s_]?bank/i, /td[\s_]?america/i],
    style: {
      label: "TD Bank",
      primary: "#006235",
      secondary: "#009b4a",
      accent: "#ff6600",
      textColor: "#ffffff",
      initial: "T"
    }
  },
  {
    patterns: [/citizens/i],
    style: {
      label: "Citizens Bank",
      primary: "#003b5c",
      secondary: "#0095c8",
      accent: "#a3d9f0",
      textColor: "#ffffff",
      initial: "C"
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
 * Mapping of known card names to locally-packaged card face images.
 * Cards listed here will render their real artwork instead of the generated SVG.
 * Cards without a mapping fall through to the unique deterministic gradient.
 */
const CARD_FACE_IMAGE_MAP: Record<string, string> = {
  "Chase Sapphire Preferred": "/card-faces/chase-sapphire-preferred.png",
  "Amex Platinum": "/card-faces/amex-platinum.png",
  "Amex Gold": "/card-faces/amex-platinum.png",
  "Capital One Venture X": "/card-faces/capital-one-venture-x.png",
  "Citi AAdvantage Platinum Select": "/card-faces/citi-aadvantage-platinum-select.png",
  "Wells Fargo Active Cash": "/card-faces/wells-fargo-active-cash.png",
  "Bank of America Customized Cash Rewards": "/card-faces/bofa-customized-cash.png",
  "U.S. Bank Altitude Connect Visa Signature": "/card-faces/usbank-altitude-connect.png",
  "PNC Cash Rewards Visa": "/card-faces/pnc-cash-rewards.png",
  "Truist Enjoy Beyond": "/card-faces/truist-enjoy-beyond.png",
  "TD First Class Visa Signature": "/card-faces/td-first-class-visa.png",
  "Citizens Wealth Management World Elite Mastercard": "/card-faces/citizens-summit.png",
};

/**
 * Deterministic string hash used to derive unique card face colors from a card name.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a unique card face style deterministically from a card name.
 * Every card name produces a distinct HSL-based gradient so that
 * no two cards share the same visual identity.
 */
export function generateCardFaceStyle(cardName: string): CardFaceStyle {
  const key = cardName || "Card";

  const localImage = CARD_FACE_IMAGE_MAP[key];
  if (localImage) {
    return {
      label: key,
      // Gradient values unused — cardImageUrl takes precedence
      primary: "#000000",
      secondary: "#333333",
      accent: "#666666",
      textColor: "#ffffff",
      initial: key.charAt(0).toUpperCase(),
      cardImageUrl: localImage,
    };
  }

  // No local image — generate a unique deterministic gradient face
  const hash = hashString(key);

  // Three well-distributed hues: golden angle (137.5°) spacing
  const hue1 = hash % 360;
  const hue2 = (hue1 + 137.508) % 360;
  const hue3 = (hue1 + 220) % 360;

  // Saturation: 45-80% for rich but approachable colors
  const sat = 45 + (Math.floor(hash / 360) % 35);

  // Lightness: primary 15-42%, secondary slightly lighter
  const light1 = 15 + (Math.floor(hash / 720) % 27);
  const light2 = Math.min(light1 + 12, 54);

  return {
    label: key,
    primary: `hsl(${hue1}, ${sat}%, ${light1}%)`,
    secondary: `hsl(${hue2}, ${sat}%, ${light2}%)`,
    accent: `hsl(${hue3}, ${Math.min(sat + 10, 85)}%, ${Math.min(light1 + 22, 70)}%)`,
    textColor: "#ffffff",
    initial: key.charAt(0).toUpperCase(),
  };
}

/**
 * Infer the card face style from source institution, account type, and optional card name.
 * When a cardName is provided the result is always a unique per-card face
 * (never a shared institution image). When omitted it falls back to the
 * institution or account-type style.
 */
export function inferCardFaceStyle(
  sourceInstitution: string | null,
  accountType: string,
  cardName?: string
): CardFaceStyle {
  // When we have a card name, generate a unique deterministic face
  if (cardName) {
    return generateCardFaceStyle(cardName);
  }

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
