import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: { $queryRaw: vi.fn() } }));

import { prisma } from "@/lib/db";
import { GUIDE_SLUGS } from "@/lib/guides";
import sitemap from "@/app/sitemap";
import { metadata } from "@/app/app/page";

describe("public page discovery", () => {
  it("shouldKeepDownloadAndGuidesWhenDatabaseIsUnavailable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error("unavailable"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await sitemap();

      expect(result.map(({ url }) => url)).toEqual(
        expect.arrayContaining([
          "https://deamap.es/app",
          ...GUIDE_SLUGS.map((slug) => `https://deamap.es/guia/${slug}`),
        ])
      );
    } finally {
      log.mockRestore();
    }
  });

  it("shouldListEachPublicPageOnceWhenDatabaseReturnsNoCities", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    const result = await sitemap();

    expect(result.map(({ url }) => url)).toHaveLength(new Set(result.map(({ url }) => url)).size);
  });

  it("shouldUseDownloadPageCanonicalWhenGeneratingAppMetadata", () => {
    expect(metadata.alternates?.canonical).toBe("/app");
  });
});
