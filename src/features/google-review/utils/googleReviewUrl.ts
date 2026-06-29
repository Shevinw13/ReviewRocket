/**
 * Utility functions for building and validating Google Review URLs.
 */

/**
 * Constructs a Google Review URL from a Place ID.
 * @param placeId - The Google Place ID for the business
 * @returns The direct Google Review URL
 */
export function buildGoogleReviewUrl(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${placeId}`;
}

/**
 * Validates whether a URL matches accepted Google Review URL patterns.
 * Accepted patterns:
 * - google.com/maps
 * - maps.google.com
 * - g.page
 * - search.google.com/local/writereview
 *
 * @param url - The URL to validate
 * @returns true if the URL matches a valid Google Review pattern
 */
export function validateGoogleReviewUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?google\.com\/maps/i,
    /^https?:\/\/maps\.google\.com/i,
    /^https?:\/\/(www\.)?g\.page/i,
    /^https?:\/\/search\.google\.com\/local\/writereview/i,
  ];
  return patterns.some((p) => p.test(url));
}
