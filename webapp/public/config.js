// Local-dev fallback (npm run dev serves /public as-is, no envsubst step runs).
// The Docker image overwrites this file at container start from config.template.js.
window.__ENV__ = {};
