import { createHash } from "node:crypto";
import { prisma } from "./db";

const OTP_TTL_MS = 10 * 60 * 1000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("27")) return `+${digits}`;
  if (digits.startsWith("0")) return `+27${digits.slice(1)}`;
  return `+${digits}`;
}

export async function createOtp(phone: string): Promise<{ code: string; expiresAt: Date }> {
  const normalized = normalizePhone(phone);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpCode.deleteMany({ where: { phone: normalized } });
  await prisma.otpCode.create({
    data: { phone: normalized, code: hashCode(code), expiresAt },
  });

  return { code, expiresAt };
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  const record = await prisma.otpCode.findFirst({
    where: { phone: normalized, verified: false },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date()) return false;
  if (record.code !== hashCode(code)) return false;

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return true;
}

export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const body = `Your RideSA verification code is ${code}. Valid for 10 minutes.`;

  if (!sid || !token || !from) {
    console.log(`[otp demo] ${normalizePhone(phone)}: ${code}`);
    return true;
  }

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizePhone(phone),
        From: from,
        Body: body,
      }),
    }
  );
  return res.ok;
}
