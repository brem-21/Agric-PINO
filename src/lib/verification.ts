// Verification fee per role, in GHS. ADMIN has no entry — verification doesn't apply to admins.
export const VERIFICATION_FEES: Record<string, number> = {
  FARMER: 50,
  VENDOR: 50,
  LOGISTICS: 30,
  BUYER: 10,
};
