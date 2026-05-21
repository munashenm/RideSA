import { prisma } from "./db";

function luhnCheck(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(id[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function validateSaIdFormat(idNumber: string): { valid: boolean; error?: string } {
  const cleaned = idNumber.replace(/\s/g, "");
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "SA ID must be 13 digits" };
  }
  if (!luhnCheck(cleaned)) {
    return { valid: false, error: "Invalid SA ID number" };
  }
  return { valid: true };
}

export async function verifySaId(params: {
  userId: string;
  idNumber: string;
  firstName: string;
  lastName: string;
}) {
  const format = validateSaIdFormat(params.idNumber);
  if (!format.valid) {
    return { verified: false, error: format.error };
  }

  const cleaned = params.idNumber.replace(/\s/g, "");
  const apiKey = process.env.VERIFYID_API_KEY;
  let status = "pending";
  let providerRef: string | null = null;

  if (apiKey) {
    try {
      const res = await fetch("https://api.verifyid.co.za/v1/id-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_number: cleaned,
          first_name: params.firstName,
          last_name: params.lastName,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { verified?: boolean; reference?: string };
        status = data.verified ? "verified" : "failed";
        providerRef = data.reference ?? null;
      }
    } catch (e) {
      console.error("VerifyID API error:", e);
    }
  } else {
    status = "verified";
    providerRef = "demo-local-validation";
  }

  await prisma.idVerification.upsert({
    where: { userId: params.userId },
    update: {
      idNumber: cleaned.slice(0, 6) + "*****" + cleaned.slice(-2),
      firstName: params.firstName,
      lastName: params.lastName,
      status,
      providerRef,
      verifiedAt: status === "verified" ? new Date() : null,
    },
    create: {
      userId: params.userId,
      idNumber: cleaned.slice(0, 6) + "*****" + cleaned.slice(-2),
      firstName: params.firstName,
      lastName: params.lastName,
      status,
      providerRef,
      verifiedAt: status === "verified" ? new Date() : null,
    },
  });

  if (status === "verified") {
    await prisma.user.update({
      where: { id: params.userId },
      data: { identityVerified: true },
    });
  }

  return {
    verified: status === "verified",
    status,
    providerRef,
  };
}
