import jwt from "jsonwebtoken";

export function verifyAuth(event: any) {
  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const token = authHeader.slice("Bearer ".length);
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);

  return decoded as { userId: string; email: string; role: string };
}
