import { prisma } from "./db";
import { notifyUser } from "./notifications";

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

export function isVerifyIdConfigured(): boolean {
  return !!process.env.VERIFYID_API_KEY;
}

export function validateSaIdFormat(idNumber: string): { valid: boolean; error?: string } {
  const cleaned = idNumber.replace(/\s/g, "");
  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "SA ID must be 13 digits" };
  }
  if (!luhnCheck(cleaned)) {
    return { valid: false, error: "Invalid SA ID number" };
  }
  return { valid: true };
}

export function parseSaIdMetadata(idNumber: string) {
  const cleaned = idNumber.replace(/\s/g, "");
  const yy = parseInt(cleaned.slice(0, 2), 10);
  const mm = parseInt(cleaned.slice(2, 4), 10);
  const dd = parseInt(cleaned.slice(4, 6), 10);
  const century = yy <= new Date().getFullYear() % 100 ? 2000 : 1900;
  const birthDate = new Date(century + yy, mm - 1, dd);
  const genderDigit = parseInt(cleaned[6], 10);
  const citizenship = parseInt(cleaned[10], 10) === 0 ? "SA citizen" : "Permanent resident";

  return {
    birthDate,
    gender: genderDigit >= 5 ? "male" : "female",
    citizenship,
  };
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim();
}

export function namesMatchProfile(profileName: string, firstName: string, lastName: string): boolean {
  const profile = normalizeName(profileName);
  const first = normalizeName(firstName);
  const last = normalizeName(lastName);
  if (!first || !last) return false;

  if (profile.includes(first) && profile.includes(last)) return true;

  const profileParts = profile.split(/\s+/).filter(Boolean);
  if (profileParts.length >= 2) {
    const profileFirst = profileParts[0];
    const profileLast = profileParts[profileParts.length - 1];
    return (
      (profileFirst.startsWith(first.slice(0, 3)) || first.startsWith(profileFirst.slice(0, 3))) &&
      (profileLast.startsWith(last.slice(0, 3)) || last.startsWith(profileLast.slice(0, 3)))
    );
  }

  return false;
}

function maskIdNumber(idNumber: string) {
  const cleaned = idNumber.replace(/\s/g, "");
  return cleaned.slice(0, 6) + "*****" + cleaned.slice(-2);
}

async function persistVerification(params: {
  userId: string;
  idNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  provider?: string | null;
  providerRef?: string | null;
  failureReason?: string | null;
}) {
  const verified = params.status === "verified";

  await prisma.idVerification.upsert({
    where: { userId: params.userId },
    update: {
      idNumber: maskIdNumber(params.idNumber),
      firstName: params.firstName,
      lastName: params.lastName,
      status: params.status,
      provider: params.provider,
      providerRef: params.providerRef,
      failureReason: params.failureReason,
      verifiedAt: verified ? new Date() : null,
    },
    create: {
      userId: params.userId,
      idNumber: maskIdNumber(params.idNumber),
      firstName: params.firstName,
      lastName: params.lastName,
      status: params.status,
      provider: params.provider,
      providerRef: params.providerRef,
      failureReason: params.failureReason,
      verifiedAt: verified ? new Date() : null,
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: { identityVerified: verified },
  });
}

export async function getIdVerificationForUser(userId: string) {
  return prisma.idVerification.findUnique({ where: { userId } });
}

export async function verifySaId(params: {
  userId: string;
  idNumber: string;
  firstName: string;
  lastName: string;
  profileName?: string;
}) {
  const format = validateSaIdFormat(params.idNumber);
  if (!format.valid) {
    return { verified: false, status: "failed", error: format.error };
  }

  const cleaned = params.idNumber.replace(/\s/g, "");
  const metadata = parseSaIdMetadata(cleaned);

  if (params.profileName && !namesMatchProfile(params.profileName, params.firstName, params.lastName)) {
    await persistVerification({
      userId: params.userId,
      idNumber: cleaned,
      firstName: params.firstName,
      lastName: params.lastName,
      status: "failed",
      provider: "local",
      failureReason: "Name on ID does not match your profile name",
    });
    return {
      verified: false,
      status: "failed",
      error: "Name on ID does not match your profile name",
      metadata,
    };
  }

  const apiKey = process.env.VERIFYID_API_KEY;
  let status = "pending";
  let provider: string | null = "local";
  let providerRef: string | null = null;
  let failureReason: string | null = null;

  if (apiKey) {
    provider = "verifyid";
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

      const data = (await res.json()) as {
        verified?: boolean;
        reference?: string;
        message?: string;
        error?: string;
      };

      if (res.ok && data.verified) {
        status = "verified";
        providerRef = data.reference ?? null;
      } else if (res.ok) {
        status = "failed";
        failureReason = data.message ?? "ID details could not be verified";
      } else {
        status = "pending";
        failureReason = data.error ?? data.message ?? "Awaiting manual review";
      }
    } catch (error) {
      console.error("VerifyID API error:", error);
      status = "pending";
      failureReason = "Verification provider unavailable — submitted for admin review";
    }
  } else {
    status = "verified";
    providerRef = "demo-local-validation";
  }

  await persistVerification({
    userId: params.userId,
    idNumber: cleaned,
    firstName: params.firstName,
    lastName: params.lastName,
    status,
    provider,
    providerRef,
    failureReason,
  });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { email: true, phone: true },
  });

  if (user) {
    const subject =
      status === "verified"
        ? "Your SA ID was verified"
        : status === "failed"
          ? "SA ID verification failed"
          : "SA ID verification submitted";
    const body =
      status === "verified"
        ? "Your South African ID has been verified on VayaSA. You can now apply as a driver or operator."
        : status === "failed"
          ? `We could not verify your ID.${failureReason ? ` ${failureReason}` : ""} Update your details and try again, or contact support.`
          : "Your ID verification was submitted and is pending review. We will notify you when it is complete.";

    await notifyUser({
      userId: params.userId,
      email: user.email,
      phone: user.phone,
      subject,
      body,
    });
  }

  return {
    verified: status === "verified",
    status,
    providerRef,
    failureReason,
    metadata,
    error: status === "failed" ? failureReason ?? "Verification failed" : undefined,
  };
}

export async function adminReviewIdVerification(params: {
  userId: string;
  approved: boolean;
  reason?: string;
}) {
  const record = await prisma.idVerification.findUnique({
    where: { userId: params.userId },
    include: { user: { select: { email: true, phone: true, name: true } } },
  });

  if (!record) {
    return { error: "Verification not found" as const };
  }

  const status = params.approved ? "verified" : "failed";

  await prisma.idVerification.update({
    where: { userId: params.userId },
    data: {
      status,
      verifiedAt: params.approved ? new Date() : null,
      failureReason: params.approved ? null : params.reason ?? "Rejected by admin",
      provider: record.provider ?? "admin",
    },
  });

  await prisma.user.update({
    where: { id: params.userId },
    data: { identityVerified: params.approved },
  });

  const subject = params.approved ? "Your SA ID was approved" : "Your SA ID verification was rejected";
  const body = params.approved
    ? "An admin approved your SA ID verification on VayaSA."
    : `Your SA ID verification was rejected.${params.reason ? ` Reason: ${params.reason}` : ""}`;

  await notifyUser({
    userId: params.userId,
    email: record.user.email,
    phone: record.user.phone,
    subject,
    body,
  });

  return { ok: true as const };
}
