import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { ddb } from "../../utils/db";

export const main: APIGatewayProxyHandlerV2 = async () => {
  try {
    const result = await ddb
      .scan({ TableName: process.env.USERS_TABLE! })
      .promise();
    return { statusCode: 200, body: JSON.stringify(result.Items) };
  } catch (err: any) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
