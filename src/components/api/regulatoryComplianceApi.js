// Regulatory Compliance API client — bridge between RegulatoryComplianceHub.jsx
// and the FastAPI "Regulatory-Backend" (app/api/regulatory.py -> POST /regulatory).
//
// The backend AI agent loads the rules/ PDF folder, matches the received text
// against the rules for the given target market (country) and returns the
// STRICT single-line JSON: { critical_issue, recommendation1, recommendation2 }.
//
// Base URL from .env: REACT_APP_REGULATORY_API_URL (defaults to localhost:8000).

import axios from "axios";

const BASE_URL = (process.env.REACT_APP_REGULATORY_API_URL || "http://localhost:8002").replace(/\/$/, "");

if (!process.env.REACT_APP_REGULATORY_API_URL) {
  console.warn("[regulatoryComplianceApi] REACT_APP_REGULATORY_API_URL not set; defaulting to http://localhost:8002");
}

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 90_000,
});

// Enrich errors with method + URL + status for clearer UI banners.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const cfg = error?.config || {};
    const fullUrl = `${cfg.baseURL || ""}${cfg.url || ""}`;
    const status = error?.response?.status;
    if (fullUrl) {
      error.message = status
        ? `${error.message} (${(cfg.method || "post").toUpperCase()} ${fullUrl} → ${status})`
        : `${error.message} (${(cfg.method || "post").toUpperCase()} ${fullUrl})`;
    }
    return Promise.reject(error);
  }
);

/**
 * Run the regulatory compliance check against the backend AI agent.
 * @param {Object} payload
 * @param {string} payload.adaptedText - text received from the UI to evaluate
 * @param {string} [payload.country]   - target market selected in the UI
 * @param {string} [payload.projectName]
 * @param {string} [payload.therapyArea]
 * @returns {Promise<{critical_issue:string, recommendation1:string, recommendation2:string}>}
 */
export const runRegulatoryCompliance = async ({ adaptedText, country, projectName, therapyArea }) => {
  const res = await client.post("/regulatory", {
    adaptedText,
    country,
    projectName,
    therapyArea,
  });
  const data = res?.data || {};
  return {
    critical_issue: data.critical_issue || "",
    recommendation1: data.recommendation1 || "",
    recommendation2: data.recommendation2 || "",
  };
};
