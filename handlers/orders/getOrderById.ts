import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyAuth } from "../../utils/auth";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = verifyAuth(event);

    const { id } = event.pathParameters || {};

    if (!id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing order ID" }),
      };
    }

    const result = await ddb
      .get({
        TableName: process.env.ORDERS_TABLE!,
        Key: {
          userId: auth.userId,
          orderId: id,
        },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Order not found" }),
      };
    }

    const eventId = result.Item.eventId;
    const eventsResp = await ddb
      .get({
        TableName: process.env.EVENTS_TABLE!,
        Key: { eventId: eventId },
      })
      .promise();

    //Rework
    if (!eventsResp.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Event tied to Ticket not found" }),
      };
    }

    // Fetch Tickets in one batch
    const ticketsResp = await ddb
      .batchGet({
        RequestItems: {
          [process.env.TICKETS_TABLE!]: {
            Keys: result.Item.tickets.map((id: string) => ({ ticketId: id })),
          },
        },
      })
      .promise();
    const tickets = ticketsResp.Responses?.[process.env.TICKETS_TABLE!] || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...result.Item,
        eventId: eventsResp.Item,
        tickets: tickets,
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
