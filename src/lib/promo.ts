import { prisma } from "./db";

export async function validatePromoCode(code: string, amount: number) {
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!promo || !promo.active) {
    return { valid: false as const, error: "Invalid promo code" };
  }

  const now = new Date();
  if (promo.validFrom && promo.validFrom > now) {
    return { valid: false as const, error: "Promo code not yet active" };
  }
  if (promo.validUntil && promo.validUntil < now) {
    return { valid: false as const, error: "Promo code expired" };
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    return { valid: false as const, error: "Promo code fully redeemed" };
  }

  let discount = 0;
  if (promo.discountType === "percent") {
    discount = Math.round(amount * (promo.discountValue / 100));
  } else {
    discount = promo.discountValue;
  }

  discount = Math.min(discount, amount);
  return {
    valid: true as const,
    code: promo.code,
    discount,
    finalAmount: amount - discount,
  };
}

export async function applyPromoCode(code: string) {
  await prisma.promoCode.update({
    where: { code: code.toUpperCase() },
    data: { usedCount: { increment: 1 } },
  });
}

export function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}
