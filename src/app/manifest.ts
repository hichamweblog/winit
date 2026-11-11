import type { MetadataRoute } from 'next';

/**
 * Manifest is consolidated into public/manifest.json (Option A).
 * layout.tsx explicitly links to /manifest.json.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {};
}
