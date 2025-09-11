import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";
import { v4 as uuid } from "uuid";
import * as bcrypt from "bcryptjs";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { name, email, password } = body;

    // Basic validation for email and name fields
    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: "Name, email, and password fields are required",
      };
    }

    // Check if user with the same email already exists
    const existingUser = await ddb
      .scan({
        TableName: process.env.USERS_TABLE!,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email.toLowerCase() },
      })
      .promise();
    if (existingUser.Items && existingUser.Items.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify("User with this email already exists"),
      };
    }

    // Hash the password with salt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    // defaulting role to 'staff' for simplicity
    const now = new Date().toISOString();
    const newUser = {
      userId: uuid(),
      name,
      email: email.toLowerCase(),
      role: "staff",
      createdAt: now,
      updatedAt: now,
      password: passwordHash,
    };

    await ddb
      .put({
        TableName: process.env.USERS_TABLE!,
        Item: newUser,
      })
      .promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        id: newUser.userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      }),
    };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
