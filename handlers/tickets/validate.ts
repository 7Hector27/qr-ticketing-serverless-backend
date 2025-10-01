import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyAuth } from "../../utils/auth";
import { ddb } from "../../utils/db";
import jwt from "jsonwebtoken";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  interface TicketPayload {
    ticketId: string;
    eventId: string;
    user: string;
    attendeeEmail: string;
  }
  try {
    const auth = verifyAuth(event);

    if (auth.role !== "admin" && auth.role !== "staff") {
      return {
        statusCode: 403,
        body: JSON.stringify({
          message: "Only staff or admin can validate tickets",
        }),
      };
    }

    const body = JSON.parse(event.body ?? "{}");
    const { qrCodeData } = body;

    if (!qrCodeData) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing QR code data in body",
        }),
      };
    }

    let payload;

    try {
      payload = jwt.verify(
        qrCodeData,
        process.env.TICKET_SECRET!
      ) as TicketPayload;
    } catch (err) {
      return {
        statusCode: 401,
        body: JSON.stringify({ valid: false, message: "Invalid Ticket" }),
      };
    }

    const { ticketId, eventId } = payload;

    const resp = await ddb
      .get({
        TableName: process.env.TICKETS_TABLE!,
        Key: { ticketId },
      })
      .promise();

    if (!resp.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ valid: false, message: "Ticket not found" }),
      };
    }

    const ticket = resp.Item;
    if (ticket.used) {
      return {
        statusCode: 400,
        body: JSON.stringify({ valid: false, message: "Ticket already used" }),
      };
    }

    if (ticket.eventId !== eventId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          valid: false,
          message: "Ticket not valid for this event",
        }),
      };
    }

    //  Mark ticket as used
    await ddb
      .update({
        TableName: process.env.TICKETS_TABLE!,
        Key: { ticketId: ticket.ticketId },
        UpdateExpression: "SET #used = :true",
        ConditionExpression: "attribute_exists(ticketId) AND #used = :false",
        ExpressionAttributeNames: {
          "#used": "used",
        },
        ExpressionAttributeValues: {
          ":true": true,
          ":false": false,
        },
        ReturnValues: "ALL_NEW",
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        valid: true,
        message: "Ticket valid",
        ticket: {
          ticketId: ticket.ticketId,
          eventId: ticket.eventId,
          attendeeEmail: ticket.attendeeEmail,
        },
      }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: `Internal server error: ${error.message}`,
      }),
    };
  }
};
