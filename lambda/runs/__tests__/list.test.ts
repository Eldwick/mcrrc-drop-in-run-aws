import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../list.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

function makeEvent(): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/runs",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

const context = {} as Context;

beforeEach(() => {
  ddbMock.reset();
  process.env.TABLE_NAME = "test-table";
});

describe("GET /runs (list)", () => {
  it("returns 200 with array of active runs", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: "RUN#abc-123",
          SK: "METADATA",
          GSI1PK: "ACTIVE_RUN",
          GSI1SK: "DAY#Tuesday",
          name: "Test Run",
          dayOfWeek: "Tuesday",
          startTime: "6:30 AM",
          locationName: "Test Location",
          latitude: 39.0,
          longitude: -77.1,
          typicalDistances: "4 miles",
          terrain: "Road",
          paceGroups: { sub_8: "consistently" },
          isActive: true,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const result = await handler(makeEvent(), context, () => {});
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("abc-123");
    expect(data[0].name).toBe("Test Run");
  });

  it("never includes editToken in response items", async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          PK: "RUN#abc-123",
          SK: "METADATA",
          name: "Test Run",
          dayOfWeek: "Tuesday",
          startTime: "6:30 AM",
          locationName: "Test Location",
          latitude: 39.0,
          longitude: -77.1,
          typicalDistances: "4 miles",
          terrain: "Road",
          paceGroups: {},
          isActive: true,
          editToken: "secret-token",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
    });

    const result = await handler(makeEvent(), context, () => {});
    const data = JSON.parse(result!.body).data;
    expect(data[0].editToken).toBeUndefined();
  });

  it("returns empty array when no runs exist", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    const result = await handler(makeEvent(), context, () => {});
    const data = JSON.parse(result!.body).data;
    expect(data).toEqual([]);
  });

  it("queries GSI1 with correct key condition", async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [] });

    await handler(makeEvent(), context, () => {});

    const calls = ddbMock.commandCalls(QueryCommand);
    expect(calls).toHaveLength(1);

    const input = calls[0].args[0].input;
    expect(input.IndexName).toBe("GSI1");
    expect(input.KeyConditionExpression).toBe("GSI1PK = :pk");
    expect(input.ExpressionAttributeValues).toEqual({ ":pk": "ACTIVE_RUN" });
  });
});
