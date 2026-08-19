import { env } from "../../config/env";
import { UnauthorizedError } from "../../lib/errors";

export async function verifyMsg91Token(token: string): Promise<void> {
  const res = await fetch("https://api.msg91.com/api/v5/otp/verify", {
    method: "POST",
    headers: {
      authkey: env.msg91AuthToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = (await res.json()) as { type: string; message?: string };
  console.log("[MSG91 Verify]", JSON.stringify(data));

  if (data.type !== "success") {
    throw new UnauthorizedError("OTP verification failed. Please try again.");
  }
}
