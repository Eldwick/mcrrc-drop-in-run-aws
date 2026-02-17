import { describe, it, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../create.js";

const ddbMock = mockClient(DynamoDBDocumentClient);

const validBody = {
  name: "Test Tuesday Run",
  dayOfWeek: "Tuesday",
  startTime: "6:30 AM",
  locationName: "Bethesda Elementary",
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
};

function makeEvent(body: unknown): APIGatewayProxyEvent {
  return {
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
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
  ddbMock.on(PutCommand).resolves({});
  process.env.TABLE_NAME = "test-table";
});

describe("POST /runs (create)", () => {
  it("returns 201 with editToken on valid creation", async () => {
    const result = await handler(makeEvent(validBody), context, () => {});

    expect(result).toBeDefined();
    const response = result!;
    expect(response.statusCode).toBe(201);

    const data = JSON.parse(response.body).data;
    expect(data.name).toBe("Test Tuesday Run");
    expect(data.editToken).toBeDefined();
    expect(data.id).toBeDefined();
    expect(data.isActive).toBe(true);
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
  });

  it("returns UUID format for id and editToken", async () => {
    const result = await handler(makeEvent(validBody), context, () => {});
    const data = JSON.parse(result!.body).data;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(data.id).toMatch(uuidRegex);
    expect(data.editToken).toMatch(uuidRegex);
  });

  it("returns 400 for missing required fields", async () => {
    const result = await handler(makeEvent({}), context, () => {});
    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body).error).toBeDefined();
  });

  it("returns 400 for invalid terrain enum", async () => {
    const result = await handler(
      makeEvent({ ...validBody, terrain: "Water" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("returns 400 for invalid pace group availability", async () => {
    const result = await handler(
      makeEvent({
        ...validBody,
        paceGroups: { ...validBody.paceGroups, sub_8: "always" },
      }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("returns 400 for out-of-range coordinates", async () => {
    const result = await handler(
      makeEvent({ ...validBody, latitude: 200 }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("sends correct item shape to DynamoDB", async () => {
    await handler(makeEvent(validBody), context, () => {});

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);

    const item = calls[0].args[0].input.Item!;
    expect(item.PK).toMatch(/^RUN#/);
    expect(item.SK).toBe("METADATA");
    expect(item.GSI1PK).toBe("ACTIVE_RUN");
    expect(item.GSI1SK).toBe("DAY#Tuesday");
    expect(item.editToken).toBeDefined();
    expect(item.isActive).toBe(true);
  });

  it("returns 400 for invalid JSON body", async () => {
    const event = makeEvent(validBody);
    event.body = "not json";
    const result = await handler(event, context, () => {});
    expect(result!.statusCode).toBe(400);
  });

  it("rejects request body with unknown fields", async () => {
    const result = await handler(
      makeEvent({ ...validBody, editToken: "injected-token", PK: "RUN#hack" }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body).error).toBeDefined();
  });

  it("rejects paceGroups with extra keys", async () => {
    const result = await handler(
      makeEvent({
        ...validBody,
        paceGroups: { ...validBody.paceGroups, ultra_slow: "consistently" },
      }),
      context,
      () => {}
    );
    expect(result!.statusCode).toBe(400);
  });

  it("sends PutCommand with ConditionExpression", async () => {
    await handler(makeEvent(validBody), context, () => {});

    const calls = ddbMock.commandCalls(PutCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.ConditionExpression).toBe(
      "attribute_not_exists(PK)"
    );
  });

  it("returns 409 on ConditionalCheckFailedException", async () => {
    ddbMock.on(PutCommand).rejects(
      new ConditionalCheckFailedException({
        message: "The conditional request failed",
        $metadata: {},
      })
    );

    const result = await handler(makeEvent(validBody), context, () => {});
    expect(result!.statusCode).toBe(409);
    expect(JSON.parse(result!.body).error).toContain("already exists");
  });
});
