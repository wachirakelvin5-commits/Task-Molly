// M-Pesa fees Task Molly pays, used to record a fee on every payment and payout.
// Keep in step with the rate card in .claude/skills/ops-cost/references/daraja-fees.md.
// A null fee means "not known yet": the record is saved with feeKes: null instead of a guess.

export type FeeBand = { minKes: number; maxKes: number; feeKes: number | null };

/** Either a percentage (Till style) or a table of amount bands (Paybill / B2C style). */
export type FeeRule =
  | { kind: 'percent'; percent: number | null; freeBelowKes: number; capKes: number | null }
  | { kind: 'bands'; bands: FeeBand[] };

export type RateCard = {
  /** Date of the Safaricom rate card these numbers came from; null until filled in. */
  rateCardDate: string | null;
  collection: FeeRule;
  b2c: FeeRule;
};

export const RATE_CARD: RateCard = {
  rateCardDate: null,
  collection: { kind: 'percent', percent: null, freeBelowKes: 0, capKes: null },
  b2c: {
    kind: 'bands',
    bands: [
      { minKes: 1, maxKes: 100, feeKes: null },
      { minKes: 101, maxKes: 1500, feeKes: null },
      { minKes: 1501, maxKes: 5000, feeKes: null },
      { minKes: 5001, maxKes: 20000, feeKes: null },
      { minKes: 20001, maxKes: 250000, feeKes: null },
    ],
  },
};
