import type { APIGatewayProxyHandler } from "aws-lambda";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { docClient } from "../shared/dynamo-client.js";
import { success } from "../shared/response.js";

export const handler: APIGatewayProxyHandler = async () => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "ACTIVE_RUN",
      },
    })
  );

  const runs = (result.Items ?? []).map((item) => ({
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
  }));

  return success(runs);
};
