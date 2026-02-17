import { describe, it, expect, beforeEach, vi } from "vitest";
import type { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../handler.js";

function makeEvent(q: string | null): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/geocode",
    pathParameters: null,
    queryStringParameters: q !== null ? { q } : null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
  };
}

const context = {} as Context;

const mockNominatimResponse = [
  {
    display_name: "Bethesda, Montgomery County, Maryland, USA",
    lat: "38.9847",
    lon: "-77.0947",
  },
  {
    display_name: "Rockville, Montgomery County, Maryland, USA",
    lat: "39.0840",
    lon: "-77.1528",
  },
];

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("GET /geocode", () => {
  it("returns 200 with geocode results", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.resolve(mockNominatimResponse),
    } as Response);

    const result = await handler(makeEvent("Bethesda"), context, () => {});
    expect(result!.statusCode).toBe(200);

    const data = JSON.parse(result!.body).data;
    expect(data).toHaveLength(2);
    expect(data[0].displayName).toBe(
      "Bethesda, Montgomery County, Maryland, USA"
    );
    expect(data[0].lat).toBe(38.9847);
    expect(data[0].lng).toBe(-77.0947);
  });

  it("returns 400 for missing q parameter", async () => {
    const result = await handler(makeEvent(null), context, () => {});
    expect(result!.statusCode).toBe(400);
    expect(JSON.parse(result!.body).error).toContain("Missing");
  });

  it("returns 400 for empty q parameter", async () => {
    const result = await handler(makeEvent("   "), context, () => {});
    expect(result!.statusCode).toBe(400);
  });

  it("calls Nominatim with correct URL and User-Agent", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () => Promise.resolve([]),
    } as Response);

    await handler(makeEvent("Rockville"), context, () => {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, options] = fetchSpy.mock.calls[0];
    expect(url.toString()).toContain("nominatim.openstreetmap.org/search");
    expect(url.toString()).toContain("q=Rockville");
    expect(url.toString()).toContain("format=json");
    expect(url.toString()).toContain("countrycodes=us");
    expect((options as RequestInit).headers).toEqual(
      expect.objectContaining({
        "User-Agent": expect.stringContaining("MCRRCRunFinder"),
      })
    );
  });

  it("maps response correctly with number types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      json: () =>
        Promise.resolve([
          { display_name: "Test Place", lat: "39.12345", lon: "-77.98765" },
        ]),
    } as Response);

    const result = await handler(makeEvent("test"), context, () => {});
    const data = JSON.parse(result!.body).data;

    expect(typeof data[0].lat).toBe("number");
    expect(typeof data[0].lng).toBe("number");
    expect(data[0].lat).toBe(39.12345);
    expect(data[0].lng).toBe(-77.98765);
  });
});
