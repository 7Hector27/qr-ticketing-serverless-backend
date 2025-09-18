import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing event ID" }),
      };
    }

    const result = await ddb
      .get({
        TableName: process.env.EVENTS_TABLE!,
        Key: { eventId: id },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Event not found" }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(result.Item) };
  } catch (err: any) {
    console.error("getEventById error:", err);
    return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
  }
};
