import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../shared/dynamo-client.js";
import { updateRunSchema } from "../shared/validators.js";
import { success, error } from "../shared/response.js";

const UPDATABLE_FIELDS = new Set([
  "name",
  "dayOfWeek",
  "startTime",
  "locationName",
  "latitude",
  "longitude",
  "typicalDistances",
  "terrain",
  "paceGroups",
  "contactName",
  "contactEmail",
  "contactPhone",
  "notes",
  "isActive",
]);

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

  if (!Object.values(updates).some((v) => v !== undefined)) {
    return error("No fields to update", 400);
  }

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

  // Add each provided field (only allowlisted business fields)
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && UPDATABLE_FIELDS.has(key)) {
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

  const updateResult = await docClient.send(
    new UpdateCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `RUN#${id}`, SK: "METADATA" },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: "ALL_NEW",
    })
  );

  const updated = updateResult.Attributes!;

  return success({
    id,
    name: updated.name,
    dayOfWeek: updated.dayOfWeek,
    startTime: updated.startTime,
    locationName: updated.locationName,
    latitude: updated.latitude,
    longitude: updated.longitude,
    typicalDistances: updated.typicalDistances,
    terrain: updated.terrain,
    paceGroups: updated.paceGroups,
    contactName: updated.contactName ?? null,
    contactEmail: updated.contactEmail ?? null,
    contactPhone: updated.contactPhone ?? null,
    notes: updated.notes ?? null,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  });
};
