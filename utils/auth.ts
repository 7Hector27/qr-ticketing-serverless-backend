import jwt from "jsonwebtoken";

export function verifyAuth(event: any) {
  const gatewayType = detectGatewayType(event);
  console.log("Gateway type:", gatewayType);

  const authHeader =
    event.headers?.authorization || event.headers?.Authorization;
  console.log("event.cookies:", event.cookies);
  console.log("event.headers:", event.headers);
  console.log("event.headers.cookie:", event.headers?.cookie);

  let token: string | undefined;

  // 1. Authorization header
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.replace("Bearer ", "");
  }

  // 2. If HTTP API (v2), cookies are in event.cookies
  if (!token && gatewayType === "HTTP_API" && Array.isArray(event.cookies)) {
    const cookies = Object.fromEntries(
      event.cookies.map((c: string) => {
        const [k, v] = c.split("=");
        return [k, decodeURIComponent(v)];
      })
    );
    token = cookies["authToken"];
  }

  // 3. If REST API, cookies are in event.headers.cookie
  if (!token && gatewayType === "REST_API" && event.headers?.cookie) {
    const cookies = parseCookies(event.headers.cookie);
    token = cookies["authToken"];
  }

  if (!token) {
    throw new Error("Missing authentication token");
  }

  return jwt.verify(token, process.env.JWT_SECRET!) as {
    userId: string;
    email: string;
    role: string;
    name: string;
  };
}

// helper
function parseCookies(cookieHeader: string): Record<string, string> {
  return cookieHeader.split(";").reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split("=");
    acc[key] = decodeURIComponent(value || "");
    return acc;
  }, {} as Record<string, string>);
}

function detectGatewayType(event: any): "HTTP_API" | "REST_API" | "UNKNOWN" {
  if (event.version === "2.0") return "HTTP_API";
  if (event.requestContext && event.requestContext.stage) return "REST_API";
  return "UNKNOWN";
}
