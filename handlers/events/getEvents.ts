import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const limit = event.queryStringParameters?.limit
      ? parseInt(event.queryStringParameters.limit, 10)
      : 10;

    let items: any[] = [];
    let lastKey;
    const now = new Date().toISOString(); // current time

    do {
      const params: any = {
        TableName: process.env.EVENTS_TABLE!,
        Limit: limit,
        ExclusiveStartKey: lastKey,
        FilterExpression: "#d >= :now",
        ExpressionAttributeNames: { "#d": "date" },
        ExpressionAttributeValues: { ":now": now },
      };

      if (event.queryStringParameters?.featured) {
        const isFeatured = event.queryStringParameters.featured === "true";
        params.FilterExpression += " AND featured = :featured";
        params.ExpressionAttributeValues[":featured"] = isFeatured;
      }

      const result = await ddb.scan(params).promise();

      items = items.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey;
    } while (items.length < limit && lastKey);

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: items.slice(0, limit),
        nextKey: lastKey ? encodeURIComponent(JSON.stringify(lastKey)) : null,
      }),
    };
  } catch (err: any) {
    console.error("Lambda error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
};
