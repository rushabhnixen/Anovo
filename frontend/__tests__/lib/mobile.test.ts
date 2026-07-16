import { ANOVO_WEB_URL, routeFromAnovoUrl } from "@/lib/mobile";

describe("mobile deep links", () => {
  it("maps Anovo web links to an in-app route", () => {
    expect(routeFromAnovoUrl(`${ANOVO_WEB_URL}/humanize?mode=formal#result`)).toBe(
      "/humanize?mode=formal#result",
    );
  });

  it("maps the custom URI scheme to an in-app route", () => {
    expect(routeFromAnovoUrl("anovo://paraphrase?mode=fluency")).toBe(
      "/paraphrase?mode=fluency",
    );
  });

  it("rejects unrelated and insecure web links", () => {
    expect(routeFromAnovoUrl("https://example.com/humanize")).toBeNull();
    expect(routeFromAnovoUrl("http://anovo.vercel.app/humanize")).toBeNull();
    expect(routeFromAnovoUrl("not a url")).toBeNull();
  });
});
