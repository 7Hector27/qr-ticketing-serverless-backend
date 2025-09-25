import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { verifyAuth } from "../../utils/auth";
import { v4 as uuid } from "uuid";
import jwt from "jsonwebtoken";
import { ddb } from "../../utils/db";
import { EventType, OrderType } from "../../types";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const auth = verifyAuth(event);

    if (auth.role !== "customer") {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Only customers can create orders" }),
      };
    }

    const { numberOfTickets, eventId } = JSON.parse(event.body ?? "{}");

    if (!numberOfTickets || !eventId) {
      return {
        statusCode: 400,
        body: "Missing required fields",
      };
    }

    const resp = await ddb
      .get({
        TableName: process.env.EVENTS_TABLE!,
        Key: marshall({ eventId }),
      })
      .promise();

    if (!resp.Item) throw new Error("Event not found");

    const eventResp = unmarshall(resp.Item) as EventType;
    console.log(eventResp, "eventResp");

    if (eventResp.availableTickets < numberOfTickets) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Not enough tickets available" }),
      };
    }

    // Decrement tickets atomically
    await ddb
      .update({
        TableName: process.env.EVENTS_TABLE!,
        Key: { eventId },
        UpdateExpression: "SET availableTickets = availableTickets - :dec",
        ConditionExpression: "availableTickets >= :dec",
        ExpressionAttributeValues: {
          ":dec": numberOfTickets,
        },
      })
      .promise();

    const ticketIds: string[] = [];

    for (let i = 0; i < numberOfTickets; i++) {
      // create ticket id and pass to ticketIds
      const ticketId = uuid();
      ticketIds.push(ticketId);

      //create qr code data
      const qrCodeData = jwt.sign(
        { ticketId, eventId, user: auth.userId, attendeeEmail: auth.email },
        process.env.TICKET_SECRET!,
        { algorithm: "HS256" }
      );

      //Create ticket
      const ticket = {
        ticketId,
        eventId,
        orderId: "",
        userId: auth.userId,
        attendeeEmail: auth.email,
        qrCodeData,
        createdAt: new Date().toISOString(),
        used: false,
      };
      await ddb
        .put({
          TableName: process.env.TICKETS_TABLE!,
          Item: ticket,
        })
        .promise();
    }

    const orderId = uuid();

    const order: OrderType = {
      id: orderId,
      userId: auth.userId,
      attendeeEmail: auth.email,
      eventId,
      ticketIds,
      createdAt: new Date().toISOString(),
    };

    //Save order to database
    await ddb
      .put({
        TableName: process.env.ORDERS_TABLE!,
        Item: order,
      })
      .promise();

    // link tickets to order
    await Promise.all(
      ticketIds.map((ticketId) =>
        ddb.update({
          TableName: process.env.TICKETS_TABLE!,
          Key: { ticketId },
          UpdateExpression: "SET orderId = :orderId",
          ExpressionAttributeValues: {
            ":orderId": orderId,
          },
        })
      )
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ order }),
    };
  } catch (error: any) {
    console.error(error);
    return {
      statusCode: 500,
      body: error.message,
    };
  }
};
