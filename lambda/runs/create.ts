import type { APIGatewayProxyHandler } from "aws-lambda";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../shared/dynamo-client.js";
import { createRunSchema } from "../shared/validators.js";
import { success, error } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return error("Invalid JSON body", 400);
  }

  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const id = crypto.randomUUID();
  const editToken = crypto.randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `RUN#${id}`,
    SK: "METADATA",
    GSI1PK: "ACTIVE_RUN",
    GSI1SK: `DAY#${parsed.data.dayOfWeek}`,
    id,
    ...parsed.data,
    isActive: true,
    editToken,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)",
      })
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      return error("Run with this ID already exists", 409);
    }
    throw err;
  }

  return success(
    {
      id,
      ...parsed.data,
      isActive: true,
      editToken,
      createdAt: now,
      updatedAt: now,
    },
    201
  );
};
