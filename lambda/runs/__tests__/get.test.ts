import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../get.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

const sampleItem = {
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
  paceGroups: { sub_8: "consistently" },
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  isActive: true,
  editToken: "secret-token-xyz",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function makeEvent(
  id: string | null,
  queryParams?: Record<string, string>
): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: `/runs/${id}`,
    pathParameters: id ? { id } : null,
    queryStringParameters: queryParams ?? null,
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

describe("GET /runs/{id}", () => {
  it("returns 200 for existing active run", async () => {
    ddbMock.on(GetCommand).resolves({ Item: sampleItem });

    const result = await handler(makeEvent("abc-123"), context, () => {});
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data.id).toBe("abc-123");
    expect(data.name).toBe("Test Run");
  });

  it("returns 404 for non-existent run", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(makeEvent("nonexistent"), context, () => {});
    expect(result!.statusCode).toBe(404);
  });

  it("returns 404 for inactive run without token", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { ...sampleItem, isActive: false },
    });

    const result = await handler(makeEvent("abc-123"), context, () => {});
    expect(result!.statusCode).toBe(404);
  });

  it("returns 200 for inactive run with valid token", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { ...sampleItem, isActive: false },
    });

    const result = await handler(
      makeEvent("abc-123", { token: "secret-token-xyz" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(200);
  });

  it("returns 404 for inactive run with wrong token", async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { ...sampleItem, isActive: false },
    });

    const result = await handler(
      makeEvent("abc-123", { token: "wrong-token" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(404);
  });

  it("never includes editToken in response", async () => {
    ddbMock.on(GetCommand).resolves({ Item: sampleItem });

    const result = await handler(makeEvent("abc-123"), context, () => {});
    const data = JSON.parse(result!.body).data;
    expect(data.editToken).toBeUndefined();
  });

  it("returns 404 for missing id in path", async () => {
    const event = makeEvent(null);
    event.pathParameters = null;

    const result = await handler(event, context, () => {});
    expect(result!.statusCode).toBe(404);
  });
});
