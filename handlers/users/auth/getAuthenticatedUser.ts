import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyAuth } from "../../../utils/auth";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const user = verifyAuth(event); // your helper already handles cookies/headers

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Unauthorized",
        error: err.message ?? "Invalid token",
      }),
    };
  }
};
