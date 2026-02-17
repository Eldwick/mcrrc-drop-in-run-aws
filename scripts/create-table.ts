import {
  CreateTableCommand,
  DynamoDBClient,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";

const endpoint = process.env.DYNAMODB_ENDPOINT ?? "http://localhost:8000";
const tableName = process.env.TABLE_NAME ?? "mcrrc-drop-in-runs";

const client = new DynamoDBClient({ endpoint });

async function createTable() {
  try {
    await client.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [
          { AttributeName: "PK", KeyType: "HASH" },
          { AttributeName: "SK", KeyType: "RANGE" },
        ],
        AttributeDefinitions: [
          { AttributeName: "PK", AttributeType: "S" },
          { AttributeName: "SK", AttributeType: "S" },
          { AttributeName: "GSI1PK", AttributeType: "S" },
          { AttributeName: "GSI1SK", AttributeType: "S" },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: "GSI1",
            KeySchema: [
              { AttributeName: "GSI1PK", KeyType: "HASH" },
              { AttributeName: "GSI1SK", KeyType: "RANGE" },
            ],
            Projection: {
              ProjectionType: "INCLUDE",
              NonKeyAttributes: [
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
                "createdAt",
                "updatedAt",
              ],
            },
          },
        ],
        BillingMode: "PAY_PER_REQUEST",
      })
    );
    console.log(`Created table "${tableName}" at ${endpoint}`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`Table "${tableName}" already exists at ${endpoint}`);
    } else {
      throw err;
    }
  }
}

createTable().catch((err) => {
  console.error("Failed to create table:", err);
  process.exit(1);
});
