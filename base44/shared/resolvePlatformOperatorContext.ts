/**
 * resolvePlatformOperatorContext — resolves the identity context for an
 * authorized system-level Platform Admin who may NOT carry a customer
 * client_id. This is the dedicated platform-control authorization path,
 * separate from ordinary tenant-domain authorization (resolveClientTenant).
 *
 * Grant-control functions (request/approve/revoke/list/cross-tenant-read)
 * use this path, NOT resolveClientTenant. Customer succession data is never
 * read during grant operations.
 */

export interface PlatformOperatorContext {
  user: any;
  isPlatformAdmin: boolean;
  profile_id: string;
  email: string;
}

export async function resolvePlatformOperatorContext(base44: any): Promise<PlatformOperatorContext> {
  const user = await base44.auth.me();
  if (!user) {
    throw new PlatformOperatorError("Unauthorized — no authenticated user.", 401);
  }

  const role = user.app_role || user.data?.app_role || user.role;
  const isPlatformAdmin =
    role === "Platform Admin" ||
    role === "Platform Administrator" ||
    role === "admin";

  if (!isPlatformAdmin) {
    throw new PlatformOperatorError(
      "Forbidden — platform-control path requires Platform Admin role.",
      403
    );
  }

  return {
    user,
    isPlatformAdmin: true,
    profile_id: user.id,
    email: user.email,
  };
}

export class PlatformOperatorError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "PlatformOperatorError";
    this.status = status;
  }
}