import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";
import { v4 as uuid } from "uuid";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body ?? "{}");
    const { name, email } = body;

    // Basic validation for email and name fields
    if (!name || !email) {
      return { statusCode: 400, body: "Name and email are required" };
    }

    // Check if user with the same email already exists
    const existingUser = await ddb
      .scan({
        TableName: process.env.USERS_TABLE!,
        FilterExpression: "email = :email",
        ExpressionAttributeValues: { ":email": email },
      })
      .promise();
    if (existingUser.Items && existingUser.Items.length > 0) {
      return { statusCode: 400, body: "User with this email already exists" };
    }
    // Create new user
    // defaulting role to 'staff' for simplicity
    const now = new Date().toISOString();
    const newUser = {
      userId: uuid(),
      name,
      email,
      role: "staff",
      createdAt: now,
      updatedAt: now,
    };

    await ddb
      .put({
        TableName: process.env.USERS_TABLE!,
        Item: newUser,
      })
      .promise();
    return { statusCode: 201, body: JSON.stringify(newUser) };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
