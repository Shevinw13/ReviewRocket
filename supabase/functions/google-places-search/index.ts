/**
 * google-places-search Edge Function
 *
 * Proxies search requests to the Google Places API (New) Text Search endpoint.
 * Keeps the API key server-side and authenticates requests via JWT.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClientWithAuth } from "../_shared/adapters/supabase.adapter.ts";

/** Shape of a single place result returned to the client. */
interface PlaceResult {
  placeId: string;
  name: string;
  formattedAddress: string;
  rating?: number;
}

/** Maximum number of results to return to the client. */
const MAX_RESULTS = 5;

/** Minimum query length required to perform a search. */
const MIN_QUERY_LENGTH = 3;

serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Method not allowed" } }),
      { status: 405, headers: { "Content-Type": "application/json" } },
    );
  }

  // 1. Validate JWT authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Authentication required" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const userClient = createSupabaseClientWithAuth(authHeader);
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: { code: "AUTH_ERROR", message: "Authentication required" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // 2. Parse request body
  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { query } = body;

  // 3. Validate query - return empty results for short queries without calling Google API
  if (!query || query.length < MIN_QUERY_LENGTH) {
    return new Response(
      JSON.stringify({ results: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // 4. Call Google Places API (New) Text Search
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) {
    console.error("[google-places-search] GOOGLE_PLACES_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "Unable to search Google Places" } }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const googleResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating",
        },
        body: JSON.stringify({ textQuery: query }),
      },
    );

    if (!googleResponse.ok) {
      console.error(
        "[google-places-search] Google Places API error:",
        googleResponse.status,
        await googleResponse.text(),
      );
      return new Response(
        JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "Unable to search Google Places" } }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const googleData = await googleResponse.json();
    const places = googleData.places || [];

    // 5. Map response to PlaceResult[] and cap at MAX_RESULTS
    const results: PlaceResult[] = places
      .slice(0, MAX_RESULTS)
      .map((place: Record<string, unknown>): PlaceResult => {
        // Strip "places/" prefix from id if present
        let placeId = (place.id as string) || "";
        if (placeId.startsWith("places/")) {
          placeId = placeId.slice("places/".length);
        }

        const displayName = place.displayName as { text?: string } | undefined;

        const result: PlaceResult = {
          placeId,
          name: displayName?.text || "",
          formattedAddress: (place.formattedAddress as string) || "",
        };

        if (typeof place.rating === "number") {
          result.rating = place.rating;
        }

        return result;
      });

    return new Response(
      JSON.stringify({ results }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[google-places-search] Unexpected error:", (err as Error).message);
    return new Response(
      JSON.stringify({ error: { code: "UPSTREAM_ERROR", message: "Unable to search Google Places" } }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
});
