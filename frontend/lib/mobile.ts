export const ANOVO_WEB_URL = "https://anovo.vercel.app";

export function routeFromAnovoUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === "anovo:") {
      const route = `/${url.hostname}${url.pathname}`.replace(/\/{2,}/g, "/");
      return `${route}${url.search}${url.hash}`;
    }
    if (url.protocol !== "https:" || url.hostname !== "anovo.vercel.app") {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
