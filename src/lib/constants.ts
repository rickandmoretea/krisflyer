export const CARD_RULES = {
  elite: {
    name: "UOB KrisFlyer World Elite",
    rateSQ: 12.5,
    rateFX: 15,
    rateOther: 20,
    capSQ: 200000,
    capFX: 200000,
    annualBonusMiles: 25000,
    annualBonusThresholdTHB: 1000000,
    signupBonusMiles: 0,
  },
  world: {
    name: "UOB KrisFlyer World",
    rateSQ: 15,
    rateFX: 15,
    rateOther: 20,
    capSQ: 100000,
    capFX: 50000,
    annualBonusMiles: 0,
    annualBonusThresholdTHB: 1000000,
    signupBonusMiles: 5000,
  },
} as const;

export type CardKey = keyof typeof CARD_RULES;

export type TargetKey = "saver" | "advantage" | "star";

export const TARGET_MILES: Record<TargetKey, number> = {
  saver: 122500,
  advantage: 172000,
  star: 131000,
};
