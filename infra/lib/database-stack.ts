import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DatabaseStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "RunsTable", {
      tableName: "mcrrc-drop-in-runs",
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: [
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
    });

    new cdk.CfnOutput(this, "TableName", {
      value: this.table.tableName,
      exportName: "McrrcDropInRuns-TableName",
    });
  }
}
