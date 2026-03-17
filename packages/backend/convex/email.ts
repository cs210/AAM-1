/**
 * Resend-based email sending for Better Auth (verification, password reset)
 * and other transactional emails. Uses RESEND_API_KEY and RESEND_FROM_EMAIL
 * from Convex environment variables.
 */

import { Resend } from "resend";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Museum& <onboarding@resend.dev>";
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/**
 * Send a transactional email via Resend. Use from Convex actions or pass
 * to Better Auth callbacks. Returns { data } on success, { error } on failure.
 */
export async function sendEmail(options: SendEmailOptions): Promise<
  | { data: { id: string }; error: null }
  | { data: null; error: { message: string } }
> {
  const to = Array.isArray(options.to) ? options.to : [options.to];
  console.log("[email] sendEmail called", { to: to.join(","), subject: options.subject });
  const resend = getResendClient();
  if (!resend) {
    console.error("[email] RESEND_API_KEY is not set. Set it in Convex Dashboard → Settings → Environment Variables.");
    return {
      data: null,
      error: { message: "RESEND_API_KEY is not set" },
    };
  }

  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (error) {
    console.error("[email] Resend API error:", error.message);
    return { data: null, error: { message: error.message } };
  }
  console.log("[email] Resend sent successfully", { id: (data as { id?: string })?.id });
  return { data: data as { id: string }, error: null };
}
