const MUSAFFA_URL = "https://0bs2hegi5nmtad4op.a1.typesense.net";
const MUSAFFA_KEY = "GRhZdTOnzVKId4Ln9G1PIvuIgn1TK0fH";

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "api") {
      return cors(json({ error: "Not found" }, 404));
    }

    const provider = parts[1];
    if (provider === "search") {
      const query = url.searchParams.get("q") || "";
      const response = await fetch(`${MUSAFFA_URL}/collections/company_profile_collection_new/documents/search?q=${encodeURIComponent(query)}&query_by=name,ticker&query_by_weights=1,2&prioritize_token_position=true&per_page=8&include_fields=id,name,ticker,exchange,cp_country`, {
        headers: { "X-TYPESENSE-API-KEY": MUSAFFA_KEY },
      });
      const data = await response.json();
      const results = (data.hits || []).map(({ document }) => ({
        ticker: document.ticker || document.id,
        name: document.name || document.ticker || document.id,
        exchange: document.exchange,
        country: document.cp_country,
      }));
      return cors(json({ results }));
    }

    if (parts.length < 3) {
      return cors(json({ error: "Not found" }, 404));
    }
    const ticker = decodeURIComponent(parts[2]).toUpperCase();

    try {
      if (provider === "halalsh") {
        const suffix = parts[3] ? `/${parts[3]}` : "";
        const response = await fetch(`https://api.halal.sh/app/v1/stock/${encodeURIComponent(ticker)}${suffix}`);
        return cors(new Response(response.body, { status: response.status, headers: { "content-type": "application/json" } }));
      }

      if (provider === "zoya") {
        const response = await fetch(`https://zoya.finance/stocks/${ticker.toLowerCase()}`, {
          headers: { "user-agent": "Mozilla/5.0" },
        });
        const html = await response.text();
        const escaped = ticker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const halal = new RegExp(`\\b${escaped} is Shariah-compliant and therefore\\s+considered halal`, "i").test(html);
        const haram = new RegExp(`\\b${escaped} is not Shariah-compliant and therefore\\s+not considered halal`, "i").test(html);
        return cors(json({
          platform: "Zoya",
          verdict: halal ? "halal" : haram ? "haram" : "not_found",
          grade: null,
          details: halal || haram ? "Verdict read from Zoya's public stock screening page." : "Zoya did not publish a readable verdict for this ticker.",
        }));
      }

      if (provider === "musaffa") {
        const response = await fetch(`${MUSAFFA_URL}/collections/stocks_data/documents/${encodeURIComponent(ticker)}`, {
          headers: { "X-TYPESENSE-API-KEY": MUSAFFA_KEY },
        });
        if (!response.ok) return cors(json({ platform: "Musaffa", verdict: "not_found", details: "Musaffa result unavailable." }));
        const data = await response.json();
        const verdict = { COMPLIANT: "halal", NON_COMPLIANT: "haram", QUESTIONABLE: "doubtful" }[data.sharia_compliance || data.musaffaHalalRating] || "not_found";
        return cors(json({
          platform: "Musaffa",
          verdict,
          grade: null,
          rating: data.ranking_v2,
          ratios: { debt: data.interestBearingDebtRatio, cash: data.interestBearingAssetsRatio, prohibited: data.businessNonCompliantRatio },
          details: `Business-compliant revenue: ${Number(data.businessCompliantRatio || 0).toFixed(2)}% · Interest-bearing debt: ${Number(data.interestBearingDebtRatio || 0).toFixed(2)}% · Interest-bearing assets: ${Number(data.interestBearingAssetsRatio || 0).toFixed(2)}%`,
        }));
      }
    } catch (error) {
      return cors(json({ error: error.message }, 502));
    }

    return cors(json({ error: "Provider not found" }, 404));
  },
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

function cors(response) {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  return new Response(response.body, { status: response.status, headers });
}
