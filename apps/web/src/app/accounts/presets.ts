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
        { name: "5 points per $1 on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on online groceries (excl. Target, Walmart, wholesale)", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on select streaming services", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on all other travel", monetaryValue: null, consumable: false },
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
        { name: "10 points per $1 on hotels and car rentals via Chase Travel", monetaryValue: null, consumable: false },
        { name: "10 points per $1 on dining via Chase Travel", monetaryValue: null, consumable: false },
        { name: "5 points per $1 on flights via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on general travel and dining", monetaryValue: null, consumable: false },
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
        { name: "5 points per $1 on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on drugstores", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Chase Freedom Flex",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% cash back on rotating quarterly categories (up to $1,500)", monetaryValue: null, consumable: false },
        { name: "5 points per $1 on travel via Chase Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining worldwide", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on drugstores", monetaryValue: null, consumable: false },
        { name: "Activation required each quarter", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "United Explorer",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2 miles per $1 on United purchases and dining", monetaryValue: null, consumable: false },
        { name: "2 miles per $1 on hotel stays", monetaryValue: null, consumable: false },
        { name: "Free first checked bag (up to $70 savings per round trip)", monetaryValue: null, consumable: false },
        { name: "Priority boarding", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "2 United Club one-time passes per year", monetaryValue: null, consumable: true },
      ],
    },
    {
      name: "Southwest Rapid Rewards Plus",
      accountType: "credit",
      annualFee: 69,
      benefits: [
        { name: "2 points per $1 on Southwest purchases and Rapid Rewards partners", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "3,000 anniversary points per year", monetaryValue: null, consumable: true },
        { name: "6,500-point bonus after account anniversary", monetaryValue: null, consumable: true },
      ],
    },
    {
      name: "Marriott Bonvoy Boundless",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "6 points per $1 on Marriott Bonvoy purchases", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "1 free night award each anniversary", monetaryValue: null, consumable: true },
        { name: "Automatic Silver Elite status", monetaryValue: null, consumable: false },
        { name: "15 Elite Night Credits per year", monetaryValue: null, consumable: true },
      ],
    },
    {
      name: "IHG One Rewards Premier",
      accountType: "credit",
      annualFee: 99,
      benefits: [
        { name: "10 points per $1 on IHG purchases", monetaryValue: null, consumable: false },
        { name: "5 points per $1 on travel, dining, and gas", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "4th night free on award stays", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Chase Slate Edge",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No penalty APR", monetaryValue: null, consumable: false },
        { name: "Auto credit line review for increase after 7 months", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Amazon Prime Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% back on Amazon.com and Whole Foods purchases with Prime", monetaryValue: null, consumable: false },
        { name: "2% back at restaurants, gas stations, and drugstores", monetaryValue: null, consumable: false },
        { name: "1% back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "American Express": [
    {
      name: "Amex Gold",
      accountType: "credit",
      annualFee: 325,
      benefits: [
        { name: "4 points per $1 at restaurants worldwide", monetaryValue: null, consumable: false },
        { name: "4 points per $1 at U.S. supermarkets (up to $25,000/yr)", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on flights booked directly or with Amex Travel", monetaryValue: null, consumable: false },
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
        { name: "5 points per $1 on flights booked directly or with Amex Travel", monetaryValue: null, consumable: false },
        { name: "5 points per $1 on prepaid hotels via Amex Travel", monetaryValue: null, consumable: false },
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
    {
      name: "Bank of America Premium Rewards",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "Unlimited 1.5 points per $1 on all purchases", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on travel and dining", monetaryValue: null, consumable: false },
        { name: "$100 annual airline incidental credit", monetaryValue: 100, consumable: true },
        { name: "$100 annual TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bank of America Premium Rewards Elite",
      accountType: "credit",
      annualFee: 550,
      benefits: [
        { name: "Unlimited 2 points per $1 on travel and dining", monetaryValue: null, consumable: false },
        { name: "Unlimited 1.5 points per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$300 annual travel credit", monetaryValue: 300, consumable: true },
        { name: "$200 airline incidental credit", monetaryValue: 200, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "Priority Pass Select lounge access", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bank of America Unlimited Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Preferred Rewards bonus up to 75% more", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bank of America BankAmericard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "0% intro APR on purchases and balance transfers", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Alaska Airlines Visa Signature",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "3 miles per $1 on Alaska Airlines purchases", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Free first checked bag (up to $70 savings per round trip)", monetaryValue: null, consumable: false },
        { name: "$100 annual Companion Fare discount", monetaryValue: 100, consumable: true },
        { name: "Boarding discount on Alaska flights", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Free Spirit Travel More",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2 points per $1 on Spirit Airlines and dining", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$100 credit for Spirit seat upgrades annually", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Susan G. Komen Customized Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back in category of choice", monetaryValue: null, consumable: false },
        { name: "2% at grocery stores and wholesale clubs", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
        { name: "Donation to Susan G. Komen at account opening", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bank of America Customized Cash Rewards for Students",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back in category of choice (gas, online shopping, dining, travel, drugstores, home improvement)", monetaryValue: null, consumable: false },
        { name: "2% at grocery stores and wholesale clubs", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% on all other purchases", monetaryValue: null, consumable: false },
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
    {
      name: "Citi Strata Premier",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "10 points per $1 on hotels, car rentals, and attractions via Citi Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining, supermarkets, gas/EV", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$100 annual hotel credit (via Citi Travel, $50 minimum spend)", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Citi Diamond Preferred",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "0% intro APR on balance transfers for 21 months", monetaryValue: null, consumable: false },
        { name: "0% intro APR on purchases for 12 months", monetaryValue: null, consumable: false },
        { name: "No late fees and no penalty APR", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citi Simplicity",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "0% intro APR on balance transfers for 21 months", monetaryValue: null, consumable: false },
        { name: "No late fees ever", monetaryValue: null, consumable: false },
        { name: "No penalty APR", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citi AAdvantage Platinum Select",
      accountType: "credit",
      annualFee: 99,
      benefits: [
        { name: "2 miles per $1 on American Airlines and dining", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Free first checked bag", monetaryValue: null, consumable: false },
        { name: "Priority boarding on AA flights", monetaryValue: null, consumable: false },
        { name: "$125 American Airlines flight discount after $20K spend", monetaryValue: 125, consumable: true },
      ],
    },
    {
      name: "Citi AAdvantage Executive World Elite",
      accountType: "credit",
      annualFee: 595,
      benefits: [
        { name: "4 miles per $1 on American Airlines purchases", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Admirals Club lounge membership", monetaryValue: null, consumable: false },
        { name: "Free first and second checked bags", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Citi AAdvantage MileUp",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2 miles per $1 on American Airlines and grocery store purchases", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Costco Anywhere Visa by Citi",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4% cash back on eligible gas/EV charging worldwide (up to $7,000/yr)", monetaryValue: null, consumable: false },
        { name: "3% cash back on restaurant and eligible travel", monetaryValue: null, consumable: false },
        { name: "2% cash back on all Costco and Costco.com purchases", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citi Rewards+",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2 points per $1 on supermarkets and gas/EV", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "10% points back on redeemed ThankYou Points (up to 100K back/yr)", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Capital One": [
    {
      name: "Capital One Venture X",
      accountType: "credit",
      annualFee: 395,
      benefits: [
        { name: "10 miles per $1 on hotels and rental cars via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "5 miles per $1 on flights via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "2 miles per $1 on all other purchases", monetaryValue: null, consumable: false },
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
        { name: "2 miles per $1 on every purchase", monetaryValue: null, consumable: false },
        { name: "5 miles per $1 on hotels and car rentals via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Capital One VentureOne Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.25x miles on every purchase", monetaryValue: null, consumable: false },
        { name: "5 miles per $1 on hotels and car rentals via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
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
    {
      name: "Capital One QuicksilverOne Cash Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "Credit score tracking included", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Capital One SavorOne Student Cash Rewards",
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
      name: "Capital One Platinum",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Automatic credit line review after 6 months", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Capital One Spark Miles for Business",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5x miles on every purchase", monetaryValue: null, consumable: false },
        { name: "5x miles on hotels and car rentals via Capital One Travel", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Capital One Spark Cash Plus",
      accountType: "credit",
      annualFee: 150,
      benefits: [
        { name: "Unlimited 2% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "Unlimited 1% cash back on all other purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Wells Fargo": [
    {
      name: "Wells Fargo Autograph",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3 points per $1 on restaurants, travel, gas/EV, transit, streaming, phone plans", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Cell phone protection", monetaryValue: null, consumable: true },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Wells Fargo Autograph Journey",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "5 points per $1 on hotels", monetaryValue: null, consumable: false },
        { name: "4 points per $1 on airlines", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining and other travel", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$50 annual airline credit", monetaryValue: 50, consumable: true },
      ],
    },
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
      name: "Wells Fargo Reflect",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "0% intro APR on purchases and balance transfers for 21 months", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Wells Fargo Attune",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash rewards on eligible purchases", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on wellness, fitness, and sustainable purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Choice Privileges Select Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5 points per $1 on Choice Hotels purchases", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on gas, grocery, and home improvement", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Annual Choice Privileges bonus points", monetaryValue: null, consumable: true },
      ],
    },
    {
      name: "Choice Privileges Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3 points per $1 on Choice Hotels purchases", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Bilt Rewards Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "1 point per $1 on rent (up to 50K points per year, no transaction fee)", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on travel (book direct)", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on dining", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Double points on Rent Day (1st of month)", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Wells Fargo Clear Access Banking Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No overdraft fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Wells Fargo Business Select",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "U.S. Bank": [
    {
      name: "U.S. Bank Altitude Reserve Visa Infinite",
      accountType: "credit",
      annualFee: 400,
      benefits: [
        { name: "5 points per $1 on prepaid hotels and car rentals via U.S. Bank Travel", monetaryValue: null, consumable: false },
        { name: "3 points per $1 on travel and mobile wallet purchases", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$325 annual travel and dining credit", monetaryValue: 325, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "Priority Pass lounge access (enrollment required)", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Altitude Connect Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4 points per $1 on travel and gas/EV", monetaryValue: null, consumable: false },
        { name: "2 points per $1 on dining, grocery, and streaming", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$20 annual travel credit", monetaryValue: 20, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Altitude Go Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4 points per $1 on dining, takeout, and restaurant delivery", monetaryValue: null, consumable: false },
        { name: "2 points per $1 at grocery stores, gas stations, and EV charging", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$15 annual streaming credit", monetaryValue: 15, consumable: true },
      ],
    },
    {
      name: "U.S. Bank Cash+ Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% cash back on two chosen categories each quarter (up to $2,000)", monetaryValue: null, consumable: false },
        { name: "2% cash back on one everyday category", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
        { name: "Activation required each quarter", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Shopper Cash Rewards Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "6% cash back on two chosen retailers each quarter (up to $1,500)", monetaryValue: null, consumable: false },
        { name: "3% cash back on eligible wholesale clubs and gas", monetaryValue: null, consumable: false },
        { name: "1.5% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Shield",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Cell phone protection up to $600", monetaryValue: 600, consumable: true },
        { name: "Purchase security and extended warranty", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "State Farm Premier Cash Rewards Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back on eligible auto, transit, and insurance purchases", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Korean Air SKYPASS Visa Signature",
      accountType: "credit",
      annualFee: 100,
      benefits: [
        { name: "2 miles per $1 on Korean Air and SKYPASS purchases", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Free first checked bag on Korean Air flights", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Visa Secured",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Credit building tool with refundable security deposit", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "U.S. Bank Business Leverage Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back on eligible business purchases (office supplies, software, telecom)", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "PNC Bank": [
    {
      name: "PNC Cash Unlimited Visa Signature",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Points Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4 points per $1 on eligible gas, grocery, and dining purchases", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Core Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Cash Rewards Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "4% cash back on eligible gas, grocery, and dining purchases", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Travel Rewards Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5 points per $1 on all purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Secured Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Credit building tool with refundable security deposit", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Business Options Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back on eligible business supplies and telecom", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Business Credit Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Visa Corporate Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Expense management tools", monetaryValue: null, consumable: false },
        { name: "Customizable spend controls", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "PNC Treasury Credit Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Integrated treasury management", monetaryValue: null, consumable: false },
        { name: "Custom spend limits per user", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Truist Bank": [
    {
      name: "Truist Enjoy Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Enjoy Travel",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5 points per $1 on all purchases", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Enjoy Beyond",
      accountType: "credit",
      annualFee: 95,
      benefits: [
        { name: "3 points per $1 on travel and dining", monetaryValue: null, consumable: false },
        { name: "Unlimited 1.5 points per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$100 annual travel credit", monetaryValue: 100, consumable: true },
        { name: "TSA PreCheck / Global Entry credit", monetaryValue: 100, consumable: true },
      ],
    },
    {
      name: "Truist Future",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Spectrum Rewards",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3 points per $1 on gas, grocery, and dining", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Enjoy Cash Secured",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Credit building tool with refundable security deposit", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Business Enjoy Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Business Enjoy Travel",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5 points per $1 on every purchase", monetaryValue: null, consumable: false },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Business Credit Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Truist Commercial Card Solutions",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Expense management integration", monetaryValue: null, consumable: false },
        { name: "Customizable spend controls", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "TD Bank": [
    {
      name: "TD DoubleUp",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 2% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Clear Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD FlexPay",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Flexible payment options on purchases over $100", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Cash",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "3% cash back on dining", monetaryValue: null, consumable: false },
        { name: "2% cash back on groceries", monetaryValue: null, consumable: false },
        { name: "1% cash back on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD First Class Visa Signature",
      accountType: "credit",
      annualFee: 89,
      benefits: [
        { name: "3 points per $1 on dining, travel, and entertainment", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "$100 annual travel credit", monetaryValue: 100, consumable: true },
        { name: "No foreign transaction fees", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Target Compasses Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "5% off on Target purchases every day", monetaryValue: null, consumable: false },
        { name: "Free standard shipping on Target.com", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Secured Visa",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Credit building tool with refundable security deposit", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Business Solutions",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "1.5% cash back on business purchases", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Aeroplan Visa Signature",
      accountType: "credit",
      annualFee: 89,
      benefits: [
        { name: "3 miles per $1 on Air Canada and Aeroplan purchases", monetaryValue: null, consumable: false },
        { name: "1 mile per $1 on all other purchases", monetaryValue: null, consumable: false },
        { name: "Free first checked bag on Air Canada flights", monetaryValue: null, consumable: false },
        { name: "Priority boarding", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "TD Essential",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
  ],
  "Citizens Bank": [
    {
      name: "Citizens Cash Back Plus World Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Clear Value Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Everyday Points Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "2 points per $1 on dining, gas, and grocery", monetaryValue: null, consumable: false },
        { name: "1 point per $1 on all other purchases", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Pay",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Flexible installment payment options", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Bank Secured Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Credit building tool with refundable security deposit", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Student Credit Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "No annual fee", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Business Cash Back Plus Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on every purchase", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Business Credit Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "1% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Free employee cards", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Commercial Executive Card",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Expense management tools", monetaryValue: null, consumable: false },
        { name: "Customizable spend controls", monetaryValue: null, consumable: false },
      ],
    },
    {
      name: "Citizens Wealth Management World Elite Mastercard",
      accountType: "credit",
      annualFee: 0,
      benefits: [
        { name: "Unlimited 1.5% cash back on all purchases", monetaryValue: null, consumable: false },
        { name: "Concierge service access", monetaryValue: null, consumable: false },
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
