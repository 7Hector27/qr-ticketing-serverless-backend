import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email and password are required" }),
      };
    }

    // Fetch user by email
    const existingUser = await ddb
      .get({
        TableName: process.env.USERS_TABLE!,
        Key: { email: email.toLowerCase() },
      })
      .promise();

    if (!existingUser.Item) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid email or password" }),
      };
    }

    const user = existingUser.Item;

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Invalid email or password" }),
      };
    }

    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment");
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ token }),
    };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
