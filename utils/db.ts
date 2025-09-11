import { DynamoDB } from "aws-sdk";
export const ddb = new DynamoDB.DocumentClient();
export const TABLES = {
  USERS: process.env.USERS_TABLE!,
};
