import type { APIGatewayProxyHandler } from "aws-lambda";
import { success, error } from "../shared/response.js";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const q = event.queryStringParameters?.q;
  if (!q || !q.trim()) {
    return error("Missing query parameter 'q'", 400);
  }

  const params = new URLSearchParams({
    q: q.trim(),
    format: "json",
    limit: "5",
    addressdetails: "1",
    countrycodes: "us",
    viewbox: "-77.53,38.93,-76.88,39.35",
    bounded: "1",
  });

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        "User-Agent": "MCRRCRunFinder/1.0 (community running group finder)",
      },
    }
  );

  const results: NominatimResult[] = await res.json();

  const mapped = results.map((r) => ({
    displayName: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  }));

  return success(mapped);
};
