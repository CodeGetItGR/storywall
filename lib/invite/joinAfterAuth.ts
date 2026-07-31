import { ApiError } from "@/lib/api/client";

export type JoinResult = "joined" | "alreadyMember" | "expired";

// Shared by /login and /register: after a successful login/register, accept
// the pending invitation. 409 means the caller is already a member — treat
// as success. 410 means the invite expired since the preview was loaded.
export async function joinEventAfterAuth(
  accept: (inviteToken: string) => Promise<unknown>,
  inviteToken: string,
): Promise<JoinResult> {
  try {
    await accept(inviteToken);
    return "joined";
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) return "alreadyMember";
    if (err instanceof ApiError && err.status === 410) return "expired";
    throw err;
  }
}
