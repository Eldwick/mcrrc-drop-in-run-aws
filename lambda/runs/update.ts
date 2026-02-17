import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../shared/dynamo-client.js";
import { updateRunSchema } from "../shared/validators.js";
import { success, error } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return error("Missing run ID", 404);
  }

  const token = event.queryStringParameters?.token;
  if (!token) {
    return error("Edit token is required", 403);
  }

  // Fetch current item to verify edit token
  const existing = await docClient.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `RUN#${id}`, SK: "METADATA" },
    })
  );

  if (!existing.Item) {
    return error("Run not found", 404);
  }

  if (existing.Item.editToken !== token) {
    return error("Invalid edit token", 403);
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? "");
  } catch {
    return error("Invalid JSON body", 400);
  }

  const parsed = updateRunSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues.map((i) => i.message).join(", "), 400);
  }

  const updates = parsed.data;
  const now = new Date().toISOString();

  // Build dynamic update expression
  const expressionParts: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};
  const removeExpressions: string[] = [];

  const addUpdate = (key: string, value: unknown) => {
    const alias = `#${key}`;
    const valAlias = `:${key}`;
    expressionNames[alias] = key;
    expressionValues[valAlias] = value;
    expressionParts.push(`${alias} = ${valAlias}`);
  };

  // Add each provided field
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      addUpdate(key, value);
    }
  }

  // Always update timestamp
  addUpdate("updatedAt", now);

  // Handle GSI key management based on isActive changes
  const currentlyActive = existing.Item.isActive;
  const newIsActive = updates.isActive ?? currentlyActive;
  const dayOfWeek = updates.dayOfWeek ?? existing.Item.dayOfWeek;

  if (newIsActive === false && currentlyActive === true) {
    // Deactivating: remove GSI keys
    removeExpressions.push("GSI1PK", "GSI1SK");
  } else if (newIsActive === true && currentlyActive === false) {
    // Reactivating: add GSI keys
    addUpdate("GSI1PK", "ACTIVE_RUN");
    addUpdate("GSI1SK", `DAY#${dayOfWeek}`);
  } else if (newIsActive === true && updates.dayOfWeek) {
    // Active and day changed: update GSI sort key
    addUpdate("GSI1SK", `DAY#${dayOfWeek}`);
  }

  let updateExpression = `SET ${expressionParts.join(", ")}`;
  if (removeExpressions.length > 0) {
    updateExpression += ` REMOVE ${removeExpressions.join(", ")}`;
  }

  await docClient.send(
    new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `RUN#${id}`, SK: "METADATA" },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    })
  );

  // Build response by merging existing item with updates
  const item = existing.Item;
  const merged: Record<string, unknown> = { ...item, ...updates, updatedAt: now };

  return success({
    id,
    name: merged.name,
    dayOfWeek: merged.dayOfWeek,
    startTime: merged.startTime,
    locationName: merged.locationName,
    latitude: merged.latitude,
    longitude: merged.longitude,
    typicalDistances: merged.typicalDistances,
    terrain: merged.terrain,
    paceGroups: merged.paceGroups,
    contactName: merged.contactName ?? null,
    contactEmail: merged.contactEmail ?? null,
    contactPhone: merged.contactPhone ?? null,
    notes: merged.notes ?? null,
    isActive: merged.isActive,
    createdAt: merged.createdAt,
    updatedAt: now,
  });
};
