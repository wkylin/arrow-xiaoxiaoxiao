import { createHash } from "node:crypto";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function buildPath(base: string, fileName: string) {
  if (base === "./" || base === "") {
    return `./${fileName}`;
  }

  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${fileName}`;
}

function createPwaAssetsPlugin(): Plugin {
  let base = "/";

  return {
    name: "arrow-pwa-assets",
    apply: "build",
    configResolved(config) {
      base = config.base;
    },
    generateBundle(_options, bundle) {
      const emittedFiles = Object.values(bundle)
        .map((entry) => entry.fileName)
        .filter((fileName) => !fileName.endsWith(".map"));

      const precacheUrls = Array.from(new Set([
        buildPath(base, ""),
        buildPath(base, "index.html"),
        buildPath(base, "manifest.webmanifest"),
        buildPath(base, "icons/icon-192.png"),
        buildPath(base, "icons/icon-512.png"),
        buildPath(base, "icons/icon-maskable-512.png"),
        buildPath(base, "icons/apple-touch-icon.png"),
        ...emittedFiles.map((fileName) => buildPath(base, fileName)),
      ]));

      const cacheVersion = createHash("sha1")
        .update(precacheUrls.join("|"))
        .digest("hex")
        .slice(0, 8);

      const serviceWorkerSource = `const CACHE_NAME = "arrow-pwa-${cacheVersion}";
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const NAVIGATION_FALLBACKS = ${JSON.stringify([
        buildPath(base, "index.html"),
        buildPath(base, ""),
      ], null, 2)};

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((cacheKey) => cacheKey !== CACHE_NAME)
        .map((cacheKey) => caches.delete(cacheKey)),
    );
    await self.clients.claim();
  })());
});

async function matchNavigationFallback() {
  for (const url of NAVIGATION_FALLBACKS) {
    const cached = await caches.match(url);
    if (cached) {
      return cached;
    }
  }
  return Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      } catch {
        return matchNavigationFallback();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok && requestUrl.protocol.startsWith("http")) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch {
      return caches.match(request);
    }
  })());
});`;

      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: serviceWorkerSource,
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), createPwaAssetsPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: "es2020",
  },
});
