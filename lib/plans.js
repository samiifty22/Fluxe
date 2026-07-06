export const TRIAL_DAYS = 3;

export const FEATURES = [
  "Product Scout — AI product research (Claude)",
  "Supplier Connect — CJ Dropshipping sourcing",
  "Creative Studio — ad copy, scripts & captions",
  "Ad Launch — Meta + TikTok campaign builder",
  "Store Manager — Shopify listings",
  "Fulfillment — ShipBob order routing",
  "Analytics — live ROAS / CAC dashboard",
  "Finance — P&L tracking",
  "Unlimited pipeline items",
  "Email support",
];

export const PLANS = {
  monthly: { id: "monthly", label: "Monthly", price: 20, period: "mo", priceEnvVar: "STRIPE_PRICE_MONTHLY" },
  yearly:  { id: "yearly",  label: "Yearly",  price: 100, period: "yr", priceEnvVar: "STRIPE_PRICE_YEARLY" },
};
