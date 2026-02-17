#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { DatabaseStack } from "../lib/database-stack";
import { ApiStack } from "../lib/api-stack";

const app = new cdk.App();

const databaseStack = new DatabaseStack(app, "McrrcDropInRuns-Database");

new ApiStack(app, "McrrcDropInRuns-Api", {
  table: databaseStack.table,
});
