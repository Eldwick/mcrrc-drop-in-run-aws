import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../update.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

const existingItem = {
  PK: "RUN#abc-123",
  SK: "METADATA",
  GSI1PK: "ACTIVE_RUN",
  GSI1SK: "DAY#Tuesday",
  id: "abc-123",
  name: "Test Run",
  dayOfWeek: "Tuesday",
  startTime: "6:30 AM",
  locationName: "Test Location",
  latitude: 39.0,
  longitude: -77.1,
  typicalDistances: "4 miles",
  terrain: "Road",
  paceGroups: {
    sub_8: "consistently",
    "8_to_9": "frequently",
    "9_to_10": "sometimes",
    "10_plus": "rarely",
  },
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  isActive: true,
  editToken: "valid-token-123",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

function makeEvent(
  id: string,
  token: string | null,
  body: unknown
): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "PUT",
    isBase64Encoded: false,
    path: `/runs/${id}`,
    pathParameters: { id },
    queryStringParameters: token ? { token } : null,
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

describe("PUT /runs/{id} (update)", () => {
  it("returns 200 on valid update with matching token", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { name: "Updated Run" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data.name).toBe("Updated Run");
    expect(data.editToken).toBeUndefined();
  });

  it("returns 403 for missing token", async () => {
    const result = await handler(
      makeEvent("abc-123", null, { name: "Updated" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(403);
  });

  it("returns 403 for incorrect token", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });

    const result = await handler(
      makeEvent("abc-123", "wrong-token", { name: "Updated" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(403);
  });

  it("returns 404 for non-existent run", async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined });

    const result = await handler(
      makeEvent("nonexistent", "some-token", { name: "Updated" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(404);
  });

  it("returns 400 for invalid body", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { terrain: "Water" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("supports partial updates (single field)", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { startTime: "7:00 AM" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data.startTime).toBe("7:00 AM");
    expect(data.name).toBe("Test Run"); // unchanged field preserved
  });

  it("allows deactivating runs", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { isActive: false }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data.isActive).toBe(false);

    // Verify GSI keys are removed
    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    const expression = updateCalls[0].args[0].input.UpdateExpression!;
    expect(expression).toContain("REMOVE");
    expect(expression).toContain("GSI1PK");
  });

  it("allows reactivating runs", async () => {
    const inactiveItem = { ...existingItem, isActive: false };
    delete (inactiveItem as Record<string, unknown>).GSI1PK;
    delete (inactiveItem as Record<string, unknown>).GSI1SK;
    ddbMock.on(GetCommand).resolves({ Item: inactiveItem });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { isActive: true }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data.isActive).toBe(true);

    // Verify GSI keys are set
    const updateCalls = ddbMock.commandCalls(UpdateCommand);
    const values = updateCalls[0].args[0].input.ExpressionAttributeValues!;
    expect(values[":GSI1PK"]).toBe("ACTIVE_RUN");
  });

  it("updates updatedAt timestamp", async () => {
    ddbMock.on(GetCommand).resolves({ Item: existingItem });
    ddbMock.on(UpdateCommand).resolves({});

    const result = await handler(
      makeEvent("abc-123", "valid-token-123", { name: "New Name" }),
      context,
      () => {}
    );

    const data = JSON.parse(result!.body).data;
    expect(data.updatedAt).not.toBe("2024-01-01T00:00:00Z");
  });
});
