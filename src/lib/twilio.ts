import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio {
  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const c = getClient();
  await c.messages.create({
    from: `whatsapp:${whatsappNumber}`,
    to: `whatsapp:${to}`,
    body,
  });
}

export async function sendWhatsAppToGroup(
  groupParticipants: string[],
  body: string
): Promise<void> {
  // Twilio WhatsApp doesn't support group messages directly.
  // We send individual messages to all participants.
  const promises = groupParticipants.map((phone) => sendWhatsApp(phone, body));
  await Promise.allSettled(promises);
}

export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const tw = twilio;
  return tw.validateRequest(authToken, signature, url, params);
}
