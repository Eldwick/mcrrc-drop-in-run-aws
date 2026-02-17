import { describe, it, expect } from "vitest";
import { haversineDistance } from "./haversine";

describe("haversineDistance", () => {
  it("returns 0 for the same point", () => {
    const distance = haversineDistance(39.0840, -77.1528, 39.0840, -77.1528);
    expect(distance).toBe(0);
  });

  it("calculates distance between Bethesda and Rockville (~6 miles)", () => {
    // Bethesda (38.9849, -77.0941) to Rockville (39.0840, -77.1528)
    const distance = haversineDistance(38.9849, -77.0941, 39.0840, -77.1528);
    // Should be roughly 7.5 miles straight-line
    expect(distance).toBeGreaterThan(5);
    expect(distance).toBeLessThan(10);
  });

  it("calculates a known long distance (NYC to LA ~2,451 miles)", () => {
    // NYC (40.7128, -74.0060) to LA (34.0522, -118.2437)
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("handles negative coordinates (Southern/Eastern hemispheres)", () => {
    // Sydney (-33.8688, 151.2093) to Auckland (-36.8485, 174.7633)
    const distance = haversineDistance(
      -33.8688,
      151.2093,
      -36.8485,
      174.7633
    );
    expect(distance).toBeGreaterThan(1300);
    expect(distance).toBeLessThan(1400);
  });

  it("is symmetric (A→B equals B→A)", () => {
    const ab = haversineDistance(38.9849, -77.0941, 39.0840, -77.1528);
    const ba = haversineDistance(39.0840, -77.1528, 38.9849, -77.0941);
    expect(ab).toBeCloseTo(ba, 10);
  });

  it("handles antipodal points (max distance ~12,451 miles)", () => {
    // North Pole to South Pole
    const distance = haversineDistance(90, 0, -90, 0);
    expect(distance).toBeGreaterThan(12400);
    expect(distance).toBeLessThan(12500);
  });
});
