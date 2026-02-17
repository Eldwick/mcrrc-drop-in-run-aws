import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { seedRuns } from "./seed-data.js";

const TABLE_NAME = process.env.TABLE_NAME ?? "mcrrc-drop-in-runs";

const client = new DynamoDBClient(
  process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT }
    : {}
);
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

async function seed() {
  const now = new Date().toISOString();

  const items = seedRuns.map((run) => {
    const id = crypto.randomUUID();
    const editToken = crypto.randomUUID();

    return {
      PutRequest: {
        Item: {
          PK: `RUN#${id}`,
          SK: "METADATA",
          GSI1PK: "ACTIVE_RUN",
          GSI1SK: `DAY#${run.dayOfWeek}`,
          id,
          ...run,
          editToken,
          createdAt: now,
          updatedAt: now,
        },
      },
      _meta: { name: run.name, editToken },
    };
  });

  // BatchWrite supports up to 25 items per request
  const putRequests = items.map((item) => ({
    PutRequest: item.PutRequest.Item
      ? { Item: item.PutRequest.Item }
      : item.PutRequest,
  }));

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [TABLE_NAME]: putRequests,
      },
    })
  );

  console.log(`Seeded ${items.length} runs to table "${TABLE_NAME}":\n`);
  for (const item of items) {
    console.log(`  ${item._meta.name}`);
    console.log(`    Edit token: ${item._meta.editToken}\n`);
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
