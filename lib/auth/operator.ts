export type Role = "VIEWER" | "OPERATOR" | "ADMIN";

export type Operator = Readonly<{
  id: string;
  role: Role;
}>;

const DEFAULT_OPERATOR: Operator = { id: "anonymous", role: "VIEWER" };

function normalizeRole(raw: string | null): Role | null {
  if (!raw) return null;
  const r = raw.trim().toUpperCase();
  if (r === "VIEWER" || r === "OPERATOR" || r === "ADMIN") return r;
  return null;
}

/**
 * Simple header-based identity.
 *
 * Headers:
 * - x-ares-operator-id: string
 * - x-ares-role: VIEWER | OPERATOR | ADMIN
 *
 * If missing/invalid => VIEWER.
 */
export function getOperatorFromRequest(request: Request): Operator {
  const id = request.headers.get("x-ares-operator-id")?.trim();
  const role = normalizeRole(request.headers.get("x-ares-role")) ?? "VIEWER";

  if (!id) return DEFAULT_OPERATOR;
  return { id, role };
}

export function canExecute(role: Role): boolean {
  return role === "OPERATOR" || role === "ADMIN";
}

export function canOverride(role: Role): boolean {
  return role === "ADMIN";
}
