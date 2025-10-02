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

    // Parse query params for pagination
    const limit = 3; // fixed at 3 per request
    const lastKey = event.queryStringParameters?.lastKey
      ? JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey))
      : undefined;

    const orderResp = await ddb
      .query({
        TableName: process.env.ORDERS_TABLE!,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": auth.userId },
        Limit: limit,
        ExclusiveStartKey: lastKey, // continue from where we left off
        ScanIndexForward: false, // newest orders first
      })
      .promise();

    const orders = orderResp.Items || [];

    // Collect unique eventIds
    const eventIds = [...new Set(orders.map((o) => o.eventId))];

    let events: any[] = [];
    if (eventIds.length > 0) {
      const eventsResp = await ddb
        .batchGet({
          RequestItems: {
            [process.env.EVENTS_TABLE!]: {
              Keys: eventIds.map((id) => ({ eventId: id })),
            },
          },
        })
        .promise();

      events = eventsResp.Responses?.[process.env.EVENTS_TABLE!] || [];
    }

    const eventMap = events.reduce((acc, ev) => {
      acc[ev.eventId] = ev;
      return acc;
    }, {} as Record<string, any>);

    const populatedOrders = orders.map((order) => ({
      ...order,
      event: eventMap[order.eventId] || null,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        orders: populatedOrders,
        lastKey: orderResp.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(orderResp.LastEvaluatedKey))
          : null,
      }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
