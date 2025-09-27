import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyAuth } from "../../utils/auth";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = verifyAuth(event);

    if (auth.role !== "customer") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Only customers can view their orders",
        }),
      };
    }

    const orderResp = await ddb
      .query({
        TableName: process.env.ORDERS_TABLE!,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": auth.userId },
      })
      .promise();

    const orders = orderResp.Items || [];

    // Collect eventIds
    const eventIds = orders.map((o) => o.eventId);

    // Fetch events in one batch
    const eventsResp = await ddb
      .batchGet({
        RequestItems: {
          [process.env.EVENTS_TABLE!]: {
            Keys: eventIds.map((id) => ({ eventId: id })),
          },
        },
      })
      .promise();

    const events = eventsResp.Responses?.[process.env.EVENTS_TABLE!] || [];

    // Build a quick lookup
    const eventMap = events.reduce((acc, ev) => {
      acc[ev.eventId] = ev;
      return acc;
    }, {} as Record<string, any>);

    // Attach event data to orders
    const populatedOrders = orders.map((order) => ({
      ...order,
      event: eventMap[order.eventId] || null,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ orders: populatedOrders }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
