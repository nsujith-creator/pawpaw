// srcset for a private photo address: the browser picks the smallest size that looks sharp.
// Safe to use in the browser; it only builds strings.
export function photoSrcSet(url: string): string {
  return `${url}?w=480 480w, ${url}?w=960 960w, ${url}?w=1600 1600w`
}
