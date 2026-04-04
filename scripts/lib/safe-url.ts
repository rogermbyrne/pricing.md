/**
 * Validates that a URL is safe to fetch — blocks private IPs, loopback,
 * link-local, cloud metadata endpoints, and encoded IP bypass vectors.
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;

    const host = parsed.hostname.replace(/^\[|\]$/g, "");

    // Block loopback and special addresses
    if (host === "localhost" || host === "0.0.0.0") return false;

    // Block IPv4 private/reserved/special ranges
    if (/^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
    if (/^(224\.|225\.|226\.|227\.|228\.|229\.|23[0-9]\.|24[0-9]\.|25[0-5]\.)/.test(host)) return false; // multicast + reserved + broadcast
    if (host === "255.255.255.255") return false;

    // Block IPv6 loopback, mapped IPv4, link-local, ULA
    if (/^(::1|::ffff:|fe80:|fc00:|fd00:|::$)/i.test(host)) return false;

    // Block numeric IP encodings (decimal integer, hex, octal) that bypass dotted-decimal checks
    if (/^0x[0-9a-f]+$/i.test(host)) return false;  // hex: 0x7f000001
    if (/^\d+$/.test(host)) return false;             // decimal integer: 2130706433
    if (/^0\d/.test(host)) return false;              // octal: 0177.0.0.1

    return true;
  } catch {
    return false;
  }
}
