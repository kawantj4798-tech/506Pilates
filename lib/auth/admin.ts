import { auth, currentUser } from "@clerk/nextjs/server";

function hasAdminRole(rawRole: unknown): boolean {
  return typeof rawRole === "string" && rawRole.toLowerCase() === "admin";
}

function getRoleCandidates(user: Awaited<ReturnType<typeof currentUser>>): unknown[] {
  return [user?.publicMetadata?.role, user?.privateMetadata?.role, user?.unsafeMetadata?.role];
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const user = await currentUser();
  return getRoleCandidates(user).some(hasAdminRole);
}

export async function requireAdminUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  const roleCandidates = getRoleCandidates(user);

  if (!roleCandidates.some(hasAdminRole)) {
    throw new Error("Forbidden");
  }

  return userId;
}
