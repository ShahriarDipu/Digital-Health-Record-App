const defaultCache = require("next-pwa/cache");

// Never cache authenticated API responses (visits, reminders, etc.)
const runtimeCaching = defaultCache.filter(
  (entry) => entry.options?.cacheName !== "apis"
);

module.exports = runtimeCaching;
