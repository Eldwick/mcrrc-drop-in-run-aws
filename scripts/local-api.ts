// Set environment variables before importing handlers (they read process.env at import time)
process.env.DYNAMODB_ENDPOINT ??= "http://localhost:8000";
process.env.TABLE_NAME ??= "mcrrc-drop-in-runs";

import express from "express";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

const app = express();
app.use(express.json());

// CORS — mirrors API Gateway's ALL_ORIGINS config
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

// Build a minimal APIGatewayProxyEvent from an Express request
function toApiGatewayEvent(
  req: express.Request,
  pathParameters: Record<string, string> | null = null
): APIGatewayProxyEvent {
  return {
    body: req.body ? JSON.stringify(req.body) : null,
    headers: req.headers as Record<string, string>,
    multiValueHeaders: {},
    httpMethod: req.method,
    isBase64Encoded: false,
    path: req.path,
    pathParameters,
    queryStringParameters: Object.keys(req.query).length
      ? (req.query as Record<string, string>)
      : null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

// Stub context — Lambda handlers in this project don't use it
const stubContext = {} as Context;

// Send the Lambda result back through Express
function sendResult(res: express.Response, result: APIGatewayProxyResult) {
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, String(value));
    }
  }
  res.status(result.statusCode).send(result.body);
}

// Dynamically import handlers (after env vars are set)
async function loadHandlers() {
  const [listMod, createMod, getMod, updateMod, geocodeMod] = await Promise.all([
    import("../lambda/runs/list.js"),
    import("../lambda/runs/create.js"),
    import("../lambda/runs/get.js"),
    import("../lambda/runs/update.js"),
    import("../lambda/geocode/handler.js"),
  ]);

  app.get("/runs", async (req, res) => {
    const result = await listMod.handler(toApiGatewayEvent(req), stubContext, () => {});
    if (result) sendResult(res, result as APIGatewayProxyResult);
  });

  app.post("/runs", async (req, res) => {
    const result = await createMod.handler(toApiGatewayEvent(req), stubContext, () => {});
    if (result) sendResult(res, result as APIGatewayProxyResult);
  });

  app.get("/runs/:id", async (req, res) => {
    const result = await getMod.handler(
      toApiGatewayEvent(req, { id: req.params.id }),
      stubContext,
      () => {}
    );
    if (result) sendResult(res, result as APIGatewayProxyResult);
  });

  app.put("/runs/:id", async (req, res) => {
    const result = await updateMod.handler(
      toApiGatewayEvent(req, { id: req.params.id }),
      stubContext,
      () => {}
    );
    if (result) sendResult(res, result as APIGatewayProxyResult);
  });

  app.get("/geocode", async (req, res) => {
    const result = await geocodeMod.handler(toApiGatewayEvent(req), stubContext, () => {});
    if (result) sendResult(res, result as APIGatewayProxyResult);
  });
}

const port = process.env.LOCAL_API_PORT ?? 3001;

loadHandlers().then(() => {
  app.listen(port, () => {
    console.log(`Local API server running at http://localhost:${port}`);
    console.log(`DynamoDB endpoint: ${process.env.DYNAMODB_ENDPOINT}`);
    console.log(`Table: ${process.env.TABLE_NAME}`);
  });
});
