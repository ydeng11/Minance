/**
 * Static presets for institution names and credit card account names.
 * Shown when creating new accounts so users get suggestions even
 * before any accounts exist in their local data.
 */

/** Top 10 U.S. banks (alphabetical for the datalist) */
export const INSTITUTION_PRESETS: string[] = [
  "Bank of America",
  "Capital One",
  "Chase",
  "Citibank",
  "Citizens Bank",
  "PNC Bank",
  "TD Bank",
  "Truist Bank",
  "U.S. Bank",
  "Wells Fargo",
];

/**
 * Popular credit cards per institution — used as account name suggestions
 * when creating or editing a credit account.
 */
export const CREDIT_CARD_PRESETS: Record<string, string[]> = {
  "Chase": [
    "Chase Sapphire Preferred",
    "Chase Sapphire Reserve",
    "Chase Freedom Unlimited",
    "Chase Freedom Flex",
    "United Explorer",
    "Southwest Rapid Rewards Plus",
    "Marriott Bonvoy Boundless",
    "IHG One Rewards Premier",
    "Chase Slate Edge",
    "Amazon Prime Visa",
  ],
  "Bank of America": [
    "Bank of America Customized Cash Rewards",
    "Bank of America Travel Rewards",
    "Bank of America Premium Rewards",
    "Bank of America Premium Rewards Elite",
    "Bank of America Unlimited Cash Rewards",
    "Bank of America BankAmericard",
    "Alaska Airlines Visa Signature",
    "Free Spirit Travel More",
    "Susan G. Komen Customized Cash Rewards",
    "Bank of America Customized Cash Rewards for Students",
  ],
  "Citibank": [
    "Citi Double Cash",
    "Citi Custom Cash",
    "Citi Strata Premier",
    "Citi Diamond Preferred",
    "Citi Simplicity",
    "Citi AAdvantage Platinum Select",
    "Citi AAdvantage Executive World Elite",
    "Citi AAdvantage MileUp",
    "Costco Anywhere Visa by Citi",
    "Citi Rewards+",
  ],
  "Wells Fargo": [
    "Wells Fargo Autograph",
    "Wells Fargo Autograph Journey",
    "Wells Fargo Active Cash",
    "Wells Fargo Reflect",
    "Wells Fargo Attune",
    "Choice Privileges Select Visa",
    "Choice Privileges Mastercard",
    "Bilt Rewards Mastercard",
    "Wells Fargo Clear Access Banking Visa",
    "Wells Fargo Business Select",
  ],
  "U.S. Bank": [
    "U.S. Bank Altitude Reserve Visa Infinite",
    "U.S. Bank Altitude Connect Visa Signature",
    "U.S. Bank Altitude Go Visa Signature",
    "U.S. Bank Cash+ Visa Signature",
    "U.S. Bank Shopper Cash Rewards Visa Signature",
    "U.S. Bank Shield",
    "State Farm Premier Cash Rewards Visa Signature",
    "Korean Air SKYPASS Visa Signature",
    "U.S. Bank Visa Secured",
    "U.S. Bank Business Leverage Visa Signature",
  ],
  "PNC Bank": [
    "PNC Cash Unlimited Visa Signature",
    "PNC Points Visa",
    "PNC Core Visa",
    "PNC Cash Rewards Visa",
    "PNC Travel Rewards Visa",
    "PNC Secured Visa",
    "PNC Business Options Visa",
    "PNC Business Credit Card",
    "PNC Visa Corporate Card",
    "PNC Treasury Credit Card",
  ],
  "Truist Bank": [
    "Truist Enjoy Cash",
    "Truist Enjoy Travel",
    "Truist Enjoy Beyond",
    "Truist Future",
    "Truist Spectrum Rewards",
    "Truist Enjoy Cash Secured",
    "Truist Business Enjoy Cash",
    "Truist Business Enjoy Travel",
    "Truist Business Credit Card",
    "Truist Commercial Card Solutions",
  ],
  "Capital One": [
    "Capital One Venture X",
    "Capital One Venture Rewards",
    "Capital One VentureOne Rewards",
    "Capital One Savor Cash Rewards",
    "Capital One Quicksilver Cash Rewards",
    "Capital One QuicksilverOne Cash Rewards",
    "Capital One SavorOne Student Cash Rewards",
    "Capital One Platinum",
    "Capital One Spark Miles for Business",
    "Capital One Spark Cash Plus",
  ],
  "TD Bank": [
    "TD DoubleUp",
    "TD Clear Visa",
    "TD FlexPay",
    "TD Cash",
    "TD First Class Visa Signature",
    "TD Target Compasses Mastercard",
    "TD Secured Visa",
    "TD Business Solutions",
    "TD Aeroplan Visa Signature",
    "TD Essential",
  ],
  "Citizens Bank": [
    "Citizens Cash Back Plus World Mastercard",
    "Citizens Clear Value Mastercard",
    "Citizens Everyday Points Mastercard",
    "Citizens Pay",
    "Citizens Bank Secured Mastercard",
    "Citizens Student Credit Card",
    "Citizens Business Cash Back Plus Mastercard",
    "Citizens Business Credit Card",
    "Citizens Commercial Executive Card",
    "Citizens Wealth Management World Elite Mastercard",
  ],
};

/**
 * All credit card account name suggestions, flat list for the datalist.
 */
export const ALL_CREDIT_CARD_PRESETS: string[] = Object.values(CREDIT_CARD_PRESETS).flat();

// ─── Rich metadata presets ────────────────────────────────────────

/** A credit-card preset with enough metadata to pre-fill classMetadata. */
export interface CreditCardPreset {
  name: string;
  accountType: string;
  annualFee: number | null;
  benefits: Array<{ name: string; monetaryValue: number | null; consumable: boolean }>;
}

/**
 * Rich metadata for a subset of popular cards.
 * Cards not listed here still appear as name-only suggestions
 * (via CREDIT_CARD_PRESETS) and get default credit metadata.
 */
export const CREDIT_CARD_PRESETS_META: Record<string, CreditCardPreset[]> = {
  "Chase": [
    {
      name: "Chase Sapphire Preferred",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "5x on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3x on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3x on online groceries (excl. Target, Walmart, wholesale)", monetaryValue: null, consumable: false },
        { name: "3x on select streaming services", monetaryValue: null, consumable: false },
        { name: "2x on all other travel", monetaryValue: null, consumable: false },
        { name: "$50 annual Chase Travel hotel credit", monetaryValue: 50, consumable: true },
        { name: "10% anniversary points bonus", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Chase Sapphire Reserve",
      accountType: "credit",
      annualFee: 550,
      benefits: [
        { name: "$300 annual travel credit", monetaryValue: 300, consumable: true },
        { name: "10x on hotels and car rentals via Chase Travel", monetaryValue: null, consumable: false },
        { name: "10x on dining via Chase Travel", monetaryValue: null, consumable: false },
        { name: "5x on flights via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3x on general travel and dining", monetaryValue: null, consumable: false },
        { name: "Priority Pass Select lounge access (enrollment required)", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Chase Freedom Unlimited",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "5x on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3x on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3x on drugstores", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Chase Freedom Flex",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% cash back on rotating quarterly categories (up to $1,500)", monetaryValue: null, consumable: false },
        { name: "5x on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3x on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3x on drugstores", monetaryValue: null, consumable: false },
        { name: "Activation required each quarter", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "American Express": [
    {
      name: "Amex Gold",
      accountType: "credit",
      annualFee: 325,
      benefits: [
        { name: "4x at restaurants worldwide", monetaryValue: null, consumable: false },
        { name: "4x at U.S. supermarkets (up to $25,000/yr)", monetaryValue: null, consumable: false },
        { name: "3x on flights booked directly or with Amex Travel", monetaryValue: null, consumable: false },
        { name: "$10 monthly Uber Cash", monetaryValue: 120, consumable: true },
        { name: "$10 monthly dining credit (Grubhub, Cheesecake Factory, etc.)", monetaryValue: 120, consumable: true },
        { name: "$7 monthly Dunkin' credit", monetaryValue: 84, consumable: true },
        { name: "$10 quarterly Resy credit", monetaryValue: 40, consumable: true },
      ],
    },
    {
      name: "Amex Platinum",
      accountType: "credit",
      annualFee: 695,
      benefits: [
        { name: "5x on flights booked directly or with Amex Travel", monetaryValue: null, consumable: false },
        { name: "5x on prepaid hotels via Amex Travel", monetaryValue: null, consumable: false },
        { name: "$200 airline incidental credit", monetaryValue: 200, consumable: true },
        { name: "$200 Uber Cash", monetaryValue: 200, consumable: true },
        { name: "$200 hotel credit (Fine Hotels & Resorts / The Hotel Collection)", monetaryValue: 200, consumable: true },
        { name: "$240 digital entertainment credit", monetaryValue: 240, consumable: true },
        { name: "$100 Saks Fifth Avenue credit ($50 semi-annual)", monetaryValue: 100, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "Centurion Lounge access", monetaryValue: null, consumable: false },
        { name: "Walmart+ membership credit", monetaryValue: 155, consumable: true },
      ],
    },
  ],
  "Bank of America": [
    {
      name: "Bank of America Travel Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5 points per $1 on all purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bank of America Customized Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back in category of choice (gas, online shopping, dining, travel, drugstores, home improvement)", monetaryValue: null, consumable: false },
        { name: "2% at grocery stores and wholesale clubs", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
        { name: "Preferred Rewards bonus up to 75% more", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Citibank": [
    {
      name: "Citi Double Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2% total cash back (1% when you buy + 1% when you pay)", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citi Custom Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% cash back on top eligible spend category each billing cycle (up to $500)", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
        { name: "Automatic category optimization", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Capital One": [
    {
      name: "Capital One Venture X",
      accountType: "credit",
      annualFee: 395,
      benefits: [
        { name: "10x miles on hotels and rental cars via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "5x miles on flights via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "2x miles on all other purchases", monetaryValue: null, consumable: false },
        { name: "$300 annual travel credit", monetaryValue: 300, consumable: true },
        { name: "10,000 anniversary bonus miles", monetaryValue: null, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "Unlimited lounge access (Capital One Lounge, Priority Pass, Plaza Premium)", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Capital One Venture Rewards",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "Unlimited 2x miles on every purchase", monetaryValue: null, consumable: false },
        { name: "5x miles on hotels and car rentals via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Capital One Savor Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back on dining, entertainment, streaming, and grocery stores", monetaryValue: null, consumable: false },
        { name: "8% cash back on Capital One Entertainment purchases", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Capital One Quicksilver Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Wells Fargo": [
    {
      name: "Wells Fargo Active Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 2% cash rewards on eligible purchases", monetaryValue: null, consumable: false },
        { name: "Cell phone protection up to $600", monetaryValue: 600, consumable: true },
      ],
    },
    {
      name: "Wells Fargo Autograph",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3x points on restaurants, travel, gas/EV, transit, streaming, phone plans", monetaryValue: null, consumable: false },
        { name: "1x points on all other purchases", monetaryValue: null, consumable: false },
        { name: "Cell phone protection", monetaryValue: null, consumable: true },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "U.S. Bank": [
    {
      name: "U.S. Bank Altitude Go Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4x points on dining, takeout, and restaurant delivery", monetaryValue: null, consumable: false },
        { name: "2x at grocery stores, gas stations, and EV charging", monetaryValue: null, consumable: false },
        { name: "1x on all other purchases", monetaryValue: null, consumable: false },
        { name: "$15 annual streaming credit", monetaryValue: 15, consumable: true },
      ],
    },
  ],
};

/**
 * Return the rich metadata for a specific preset card, or null if the card
 * only exists in the name-only list (or doesn't exist at all).
 */
export function getPresetMetadata(
  institution: string,
  cardName: string
): CreditCardPreset | null {
  const presets = CREDIT_CARD_PRESETS_META[institution.trim()];
  if (!presets) return null;
  return presets.find((p) => p.name === cardName) ?? null;
}

/**
 * Return all card presets (with metadata) for a given institution.
 */
export function getCardPresetsForInstitution(institution: string): CreditCardPreset[] {
  return CREDIT_CARD_PRESETS_META[institution.trim()] ?? [];
}
