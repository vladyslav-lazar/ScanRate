// Single source of truth for the API base URL.
// VITE_API_URL is baked in at build time via Dockerfile.prod --build-arg.
// Falls back to empty string so all fetch calls use relative paths,
// which works behind the Nginx proxy on both local and production.
const API_URL = import.meta.env.VITE_API_URL || "https://scanrate.pp.ua/api";

export default API_URL;
