import { NextRequest, NextResponse } from "next/server";

interface VisitorSession {
  country: string;
  lastSeen: number;
}

// In-memory sliding window cache for live active visitors
const activeSessions = new Map<string, VisitorSession>();

// Predefined map of country names in Spanish
const COUNTRY_NAMES: Record<string, string> = {
  DO: "República Dominicana",
  MX: "México",
  ES: "España",
  CO: "Colombia",
  AR: "Argentina",
  CL: "Chile",
  PE: "Perú",
  VE: "Venezuela",
  US: "Estados Unidos",
  EC: "Ecuador",
  GT: "Guatemala",
  CR: "Costa Rica",
  PA: "Panamá",
  UY: "Uruguay",
  BO: "Bolivia",
  PY: "Paraguay",
  PR: "Puerto Rico",
  CU: "Cuba",
  HN: "Honduras",
  SV: "El Salvador",
  NI: "Nicaragua",
  BR: "Brasil",
  CA: "Canadá",
};

// Baseline activity distribution for the community so it always feels lively
const BASELINE_ACTIVITY: Record<string, number> = {
  DO: 5,
  MX: 4,
  ES: 3,
  CO: 2,
  AR: 2,
  CL: 1,
  US: 1,
};

function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  return countryCode
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export async function GET(req: NextRequest) {
  const now = Date.now();

  // Clean sessions older than 3 minutes
  for (const [id, session] of activeSessions.entries()) {
    if (now - session.lastSeen > 180000) {
      activeSessions.delete(id);
    }
  }

  // Detect Country from Vercel / Cloudflare geolocation headers
  let country =
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-country-code") ||
    "DO";

  country = country.toUpperCase();
  if (!COUNTRY_NAMES[country]) {
    // If unknown country code, keep or fallback
    COUNTRY_NAMES[country] = country;
  }

  // Generate visitor fingerprint (IP + User-Agent or random fallback)
  const forwardedFor = req.headers.get("x-forwarded-for") || "local";
  const userAgent = req.headers.get("user-agent") || "";
  const visitorKey = `${forwardedFor.split(",")[0].trim()}_${userAgent.slice(0, 30)}`;

  // Record this visitor
  activeSessions.set(visitorKey, {
    country,
    lastSeen: now,
  });

  // Calculate live counts per country
  const liveCounts: Record<string, number> = { ...BASELINE_ACTIVITY };

  // Add the detected real live sessions
  for (const session of activeSessions.values()) {
    liveCounts[session.country] = (liveCounts[session.country] || 0) + 1;
  }

  // Format array sorted by visitor count descending
  const countryList = Object.entries(liveCounts)
    .map(([code, count]) => ({
      code,
      name: COUNTRY_NAMES[code] || code,
      flag: getFlagEmoji(code),
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const onlineTotal = countryList.reduce((acc, c) => acc + c.count, 0);

  return NextResponse.json(
    {
      currentVisitor: {
        code: country,
        name: COUNTRY_NAMES[country] || country,
        flag: getFlagEmoji(country),
      },
      onlineTotal,
      countries: countryList.slice(0, 10), // Top 10 countries
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
