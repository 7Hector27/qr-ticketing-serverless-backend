import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";
import { v4 as uuid } from "uuid";
import { verifyAuth } from "../../utils/auth";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    //Authenticate request
    const auth = verifyAuth(event);

    //  Authorize: only admin/staff can create events
    if (auth.role !== "admin" && auth.role !== "staff") {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: "Forbidden" }),
      };
    }

    const body = JSON.parse(event.body ?? "{}");
    const {
      title,
      description,
      date,
      location,
      price,
      totalTickets,
      featured,
      imageUrl,
    } = body;

    // Event Validation
    if (
      !title ||
      !description ||
      !date ||
      !location ||
      !price ||
      !totalTickets
    ) {
      return {
        statusCode: 400,
        body: "Missing required fields",
      };
    }
    const now = new Date().toISOString();
    const eventId = uuid();

    const newEvent = {
      eventId,
      title,
      description,
      date,
      location,
      price: Number(price),
      totalTickets: Number(totalTickets),
      availableTickets: Number(totalTickets),
      createdAt: now,
      updatedAt: now,
      featured: featured,
      imageUrl: imageUrl ?? null,
    };

    //createEvent
    await ddb
      .put({
        TableName: process.env.EVENTS_TABLE!,
        Item: newEvent,
      })
      .promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        newEvent,
      }),
    };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
