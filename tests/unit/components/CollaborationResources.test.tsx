import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CollaborationResources from "@/components/CollaborationResources";

vi.mock("@/hooks/useAnalytics", () => ({
  useAnalytics: () => ({ trackEvent: vi.fn() }),
}));

describe("CollaborationResources", () => {
  afterEach(() => vi.restoreAllMocks());

  it("shouldCopyTheSelectedChannelTextWhenClipboardIsAvailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<CollaborationResources />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar texto para Instagram" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("utm_source=instagram"))
    );
  });

  it("shouldOfferTheDownloadWhenClipboardAccessFails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) },
    });
    render(<CollaborationResources />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar texto para Instagram" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Puedes seleccionar el texto o descargarlo"
    );
  });
});
