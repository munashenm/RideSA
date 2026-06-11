import { prisma } from "./db";

export type NotifyChannel = "email" | "sms" | "whatsapp" | "in_app";

export async function logNotification(params: {
  userId: string;
  channel: NotifyChannel;
  subject?: string;
  body: string;
  status: "sent" | "failed" | "pending" | "skipped";
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      channel: params.channel,
      subject: params.subject,
      body: params.body,
      status: params.status,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

export async function notifyUser(params: {
  userId: string;
  email?: string | null;
  phone?: string | null;
  subject: string;
  body: string;
  whatsapp?: boolean;
}) {
  const results: NotifyChannel[] = [];

  await logNotification({
    userId: params.userId,
    channel: "in_app",
    subject: params.subject,
    body: params.body,
    status: "sent",
  });
  results.push("in_app");

  const { sendWebPushToUser } = await import("./web-push");
  await sendWebPushToUser(params.userId, {
    title: params.subject,
    body: params.body,
  });

  if (params.email) {
    const sent = await sendEmail(params.email, params.subject, params.body);
    await logNotification({
      userId: params.userId,
      channel: "email",
      subject: params.subject,
      body: params.body,
      status: sent ? "sent" : "failed",
    });
    if (sent) results.push("email");
  }

  if (params.phone) {
    const sent = await sendSms(params.phone, params.body);
    await logNotification({
      userId: params.userId,
      channel: "sms",
      body: params.body,
      status: sent ? "sent" : "failed",
    });
    if (sent) results.push("sms");
  }

  if (params.phone && params.whatsapp) {
    const sent = await sendWhatsApp(params.phone, params.body);
    await logNotification({
      userId: params.userId,
      channel: "whatsapp",
      body: params.body,
      status: sent ? "sent" : "failed",
    });
    if (sent) results.push("whatsapp");
  }

  return results;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[email] RESEND_API_KEY not set — cannot send to ${to}`);
      return false;
    }
    console.log(`[email demo] To: ${to} | ${subject}`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "VayaSA <noreply@vayasa.co.za>",
        to: [to],
        subject,
        html: `<p>${html}</p>`,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[sms] Twilio not configured — cannot send to ${to}`);
      return false;
    }
    console.log(`[sms demo] To: ${to} | ${body}`);
    return true;
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("SMS send failed:", e);
    return false;
  }
}

async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!sid || !token || !from) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[whatsapp] Twilio not configured — cannot send to ${to}`);
      return false;
    }
    console.log(`[whatsapp demo] To: ${to} | ${body}`);
    return true;
  }

  try {
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
          To: `whatsapp:${to.replace(/^whatsapp:/, "")}`,
          From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
          Body: body,
        }),
      }
    );
    return res.ok;
  } catch (e) {
    console.error("WhatsApp send failed:", e);
    return false;
  }
}

export async function notifyVerificationDecision(params: {
  userId: string;
  email?: string | null;
  phone?: string | null;
  applicationType: "driver" | "bus_operator" | "taxi_operator";
  approved: boolean;
  reason?: string;
}) {
  const labels = {
    driver: "driver",
    bus_operator: "bus operator",
    taxi_operator: "taxi operator",
  };
  const label = labels[params.applicationType];
  const subject = params.approved
    ? `Your ${label} application was approved`
    : `Your ${label} application was rejected`;
  const body = params.approved
    ? `Good news — your VayaSA ${label} application has been approved. You can now access your dashboard and start operating on the platform.`
    : `Your VayaSA ${label} application was not approved.${params.reason ? ` Reason: ${params.reason}` : ""} You may update your documents and resubmit your application.`;

  return notifyUser({
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    subject,
    body,
    whatsapp: true,
  });
}

export async function notifyTripStatus(params: {
  userId: string;
  email?: string | null;
  phone?: string | null;
  tripLabel: string;
  status: string;
}) {
  const body = `Your VayaSA trip ${params.tripLabel} is now: ${params.status.replace(/_/g, " ")}.`;
  return notifyUser({
    userId: params.userId,
    email: params.email,
    phone: params.phone,
    subject: "Trip status update",
    body,
    whatsapp: true,
  });
}

export async function notifySOS(params: {
  userId: string;
  userName: string;
  phone?: string | null;
  rideLabel: string;
  emergencyContact?: string | null;
  adminEmail?: string;
}) {
  const body = `SOS ALERT: ${params.userName} triggered emergency on trip ${params.rideLabel}. Contact: ${params.phone ?? "unknown"}`;

  if (params.emergencyContact) {
    await sendSms(params.emergencyContact, body);
  }

  if (params.adminEmail) {
    await sendEmail(params.adminEmail, "VayaSA SOS Alert", body);
  }

  return notifyUser({
    userId: params.userId,
    subject: "SOS alert sent",
    body: "Your emergency alert was sent to VayaSA support and your emergency contact.",
    whatsapp: false,
  });
}
