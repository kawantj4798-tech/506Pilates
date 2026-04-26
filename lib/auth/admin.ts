import { auth, currentUser } from "@clerk/nextjs/server";

function hasAdminRole(rawRole: unknown): boolean {
  return typeof rawRole === "string" && rawRole.toLowerCase() === "admin";
}

export async function requireAdminUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  const roleCandidates: unknown[] = [
    user?.publicMetadata?.role,
    user?.privateMetadata?.role,
    user?.unsafeMetadata?.role,
  ];

  if (!roleCandidates.some(hasAdminRole)) {
    throw new Error("Forbidden");
  }

  return userId;
}
