// ==============================================================================
// المنصة التعليمية الموحدة — خدمة ترجمة صور السلايدات السحابية (Cloudflare R2 + Lens)
// Manifest-Aware Translation Resolution · Zero Local Bloat · Offline Cache Ready
// ==============================================================================

import { getSlidesCdnUrl, resolveAssetUrl } from "./dataService";

export interface SlideTranslationEntry {
  sha256?: string;
  status: "translated" | "skipped_arabic" | "failed";
  ar_key?: string;
  lang?: string;
}

export interface SlideTranslationManifest {
  version: number;
  render_version?: number;
  updated_at?: string;
  r2_public_url?: string;
  slides: Record<string, SlideTranslationEntry>;
}

let manifestPromise: Promise<SlideTranslationManifest | null> | null = null;
let cachedManifest: SlideTranslationManifest | null = null;

/**
 * Normalize a slide image_url (e.g. "/slides/toc/L1/slide_1.webp" or full R2 URL)
 * into its canonical R2 key ("slides/toc/L1/slide_1.webp").
 */
export function normalizeSlideKey(imageUrl?: string): string {
  if (!imageUrl) return "";
  const noQuery = imageUrl.split("?")[0].split("#")[0];
  const idx = noQuery.indexOf("slides/");
  if (idx >= 0) return noQuery.slice(idx);
  return noQuery.replace(/^\/+/, "");
}

/**
 * Derives the translated Arabic slide image URL (*.ar.webp) from an original image_url.
 */
export function resolveTranslatedSlideUrl(imageUrl?: string, renderVersion?: number): string {
  if (!imageUrl) return "";
  const resolved = resolveAssetUrl(imageUrl);
  if (!resolved || /^(data:|blob:)/i.test(resolved)) return "";
  const [base, suffix = ""] = resolved.split(/(?=[?#])/);
  const arBase = base.endsWith(".ar.webp")
    ? base
    : base.lastIndexOf(".") > base.lastIndexOf("/")
      ? `${base.slice(0, base.lastIndexOf("."))}.ar.webp`
      : `${base}.ar.webp`;
  const rv = renderVersion ?? cachedManifest?.render_version ?? 2;
  if (suffix) return `${arBase}${suffix}`;
  return `${arBase}?rv=${rv}`;
}

export function getTranslationManifestUrl(): string {
  const cdn = getSlidesCdnUrl();
  if (cdn) return `${cdn}/slides/translation-manifest.json`;
  return resolveAssetUrl("slides/translation-manifest.json");
}

/**
 * Loads slides/translation-manifest.json once per session (also cached by Service Worker).
 */
export function loadTranslationManifest(forceRefresh = false): Promise<SlideTranslationManifest | null> {
  if (!forceRefresh && cachedManifest) {
    return Promise.resolve(cachedManifest);
  }
  if (!forceRefresh && manifestPromise) {
    return manifestPromise;
  }

  const url = getTranslationManifestUrl();
  manifestPromise = fetch(url, { mode: "cors", credentials: "omit", cache: "no-cache" })
    .then(async (res) => {
      if (!res.ok) return null;
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("text/html")) return null;
      const data = (await res.json()) as SlideTranslationManifest;
      if (data && typeof data === "object" && data.slides && typeof data.slides === "object") {
        cachedManifest = data;
        return data;
      }
      return null;
    })
    .catch(() => cachedManifest);

  return manifestPromise;
}

/**
 * Checks whether a slide has an available translated Arabic image.
 * - If manifest is loaded: strictly trusts manifest status ("translated" => true, others => false).
 * - If manifest is not yet loaded/unavailable: returns true when CDN is configured so onError fallback can handle gracefully.
 */
export function isSlideTranslationAvailable(
  manifest: SlideTranslationManifest | null,
  imageUrl?: string,
  arabicOnly?: boolean
): boolean {
  if (arabicOnly || !imageUrl) return false;
  if (!manifest) return Boolean(getSlidesCdnUrl());
  const key = normalizeSlideKey(imageUrl);
  const entry = manifest.slides[key];
  return entry?.status === "translated";
}

export function countTranslatedSlidesForList(
  manifest: SlideTranslationManifest | null,
  imageUrls: string[],
  arabicOnly?: boolean
): number {
  if (arabicOnly) return 0;
  let count = 0;
  for (const u of imageUrls) {
    if (isSlideTranslationAvailable(manifest, u, arabicOnly)) count++;
  }
  return count;
}
