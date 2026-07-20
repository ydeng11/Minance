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
