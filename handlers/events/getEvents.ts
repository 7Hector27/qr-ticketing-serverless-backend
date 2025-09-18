import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const params: any = {
      TableName: process.env.EVENTS_TABLE!,
      Limit: event.queryStringParameters?.limit
        ? parseInt(event.queryStringParameters.limit, 10)
        : 10,
    };

    // Handle pagination
    if (event.queryStringParameters?.lastKey) {
      params.ExclusiveStartKey = JSON.parse(
        decodeURIComponent(event.queryStringParameters.lastKey)
      );
    }

    // Build optional filters
    let filterExpr = [];
    let exprValues: Record<string, any> = {};

    if (event.queryStringParameters?.featured) {
      const isFeatured = event.queryStringParameters.featured === "true";
      filterExpr.push("featured = :featured");
      exprValues[":featured"] = isFeatured;
    }

    if (filterExpr.length > 0) {
      params.FilterExpression = filterExpr.join(" AND ");
      params.ExpressionAttributeValues = exprValues;
    }
    const result = await ddb.scan(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        items: result.Items || [],
        nextKey: result.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      }),
    };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
