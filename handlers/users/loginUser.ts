import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { email, password } = body;

    if (!email || !password) {
      return jsonResponse(400, { message: "Email and password are required" });
    }

    // Fetch user by email
    const existingUser = await ddb
      .get({
        TableName: process.env.USERS_TABLE!,
        Key: { email: email.toLowerCase() },
      })
      .promise();

    if (!existingUser.Item) {
      return jsonResponse(401, { message: "Invalid email or password" });
    }

    const user = existingUser.Item;

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return jsonResponse(401, { message: "Invalid email or password" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not set in environment");
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      secret,
      { expiresIn: "1h" }
    );

    return jsonResponse(200, { token });
  } catch (error: any) {
    console.error("Login error:", error);
    return jsonResponse(500, { message: error.message });
  }
};

// small helper
const jsonResponse = (statusCode: number, data: any) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
