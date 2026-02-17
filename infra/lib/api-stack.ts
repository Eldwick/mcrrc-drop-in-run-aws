import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import * as path from "path";

interface ApiStackProps extends cdk.StackProps {
  table: dynamodb.Table;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { table } = props;
    const lambdaDir = path.join(__dirname, "../../lambda");

    const commonProps: Partial<lambdaNode.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      bundling: {
        minify: true,
        sourceMap: true,
      },
    };

    const createRunFn = new lambdaNode.NodejsFunction(this, "CreateRunFn", {
      ...commonProps,
      functionName: "mcrrc-create-run",
      entry: path.join(lambdaDir, "runs/create.ts"),
      environment: { TABLE_NAME: table.tableName },
    });

    const listRunsFn = new lambdaNode.NodejsFunction(this, "ListRunsFn", {
      ...commonProps,
      functionName: "mcrrc-list-runs",
      entry: path.join(lambdaDir, "runs/list.ts"),
      environment: { TABLE_NAME: table.tableName },
    });

    const getRunFn = new lambdaNode.NodejsFunction(this, "GetRunFn", {
      ...commonProps,
      functionName: "mcrrc-get-run",
      entry: path.join(lambdaDir, "runs/get.ts"),
      environment: { TABLE_NAME: table.tableName },
    });

    const updateRunFn = new lambdaNode.NodejsFunction(this, "UpdateRunFn", {
      ...commonProps,
      functionName: "mcrrc-update-run",
      entry: path.join(lambdaDir, "runs/update.ts"),
      environment: { TABLE_NAME: table.tableName },
    });

    const geocodeFn = new lambdaNode.NodejsFunction(this, "GeocodeFn", {
      ...commonProps,
      functionName: "mcrrc-geocode",
      entry: path.join(lambdaDir, "geocode/handler.ts"),
    });

    table.grantReadWriteData(createRunFn);
    table.grantReadWriteData(listRunsFn);
    table.grantReadWriteData(getRunFn);
    table.grantReadWriteData(updateRunFn);

    const api = new apigateway.RestApi(this, "RunsApi", {
      restApiName: "MCRRC Drop-In Runs API",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
        allowHeaders: ["Content-Type"],
      },
    });

    const runsResource = api.root.addResource("runs");
    runsResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(listRunsFn)
    );
    runsResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(createRunFn)
    );

    const singleRunResource = runsResource.addResource("{id}");
    singleRunResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(getRunFn)
    );
    singleRunResource.addMethod(
      "PUT",
      new apigateway.LambdaIntegration(updateRunFn)
    );

    const geocodeResource = api.root.addResource("geocode");
    geocodeResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(geocodeFn)
    );

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      exportName: "McrrcDropInRuns-ApiUrl",
    });
  }
}
