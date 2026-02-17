import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../shared/dynamo-client.js";
import { success, error } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async (event) => {
  const id = event.pathParameters?.id;
  if (!id) {
    return error("Missing run ID", 404);
  }

  const result = await docClient.send(
    new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: { PK: `RUN#${id}`, SK: "METADATA" },
    })
  );

  const item = result.Item;
  if (!item) {
    return error("Run not found", 404);
  }

  // Inactive runs are only visible with a valid edit token
  if (item.isActive === false) {
    const token = event.queryStringParameters?.token;
    if (!token || token !== item.editToken) {
      return error("Run not found", 404);
    }
  }

  return success({
    id: (item.PK as string).replace("RUN#", ""),
    name: item.name,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    locationName: item.locationName,
    latitude: item.latitude,
    longitude: item.longitude,
    typicalDistances: item.typicalDistances,
    terrain: item.terrain,
    paceGroups: item.paceGroups,
    contactName: item.contactName ?? null,
    contactEmail: item.contactEmail ?? null,
    contactPhone: item.contactPhone ?? null,
    notes: item.notes ?? null,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
};
