import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const services = vi.hoisted(() => ({
  checkPermission: vi.fn(),
  requestPermission: vi.fn(),
  getCurrentPosition: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("../../infrastructure/di/container", () => ({
  geolocationService: services,
  getNearbyAedsUseCase: { execute: services.execute },
}));

import { useNearbyAeds } from "../../presentation/hooks/useNearbyAeds";

describe("nearby discovery recovery", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    services.checkPermission.mockResolvedValue(true);
    services.getCurrentPosition.mockResolvedValue({ latitude: 40.4168, longitude: -3.7038 });
    services.execute.mockResolvedValue([]);
  });

  it("shouldClearDeniedStateWhenLocationBecomesAvailableAfterRetry", async () => {
    services.checkPermission.mockResolvedValueOnce(false);
    services.requestPermission.mockResolvedValueOnce(false);
    const { result } = renderHook(() => useNearbyAeds());
    await waitFor(() => expect(result.current.locationDenied).toBe(true));

    await act(() => result.current.refresh());

    expect(result.current.locationDenied).toBe(false);
    expect(services.execute).toHaveBeenCalledOnce();
  });

  it("shouldExplainRecoveryWithoutShowingNetworkInternalsWhenFetchFails", async () => {
    services.execute.mockRejectedValueOnce(new Error("Failed to fetch"));
    const { result } = renderHook(() => useNearbyAeds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(
      "No hemos podido cargar los desfibriladores. Comprueba tu conexión y vuelve a intentarlo."
    );
  });

  it("shouldClearErrorWhenRetrySucceeds", async () => {
    services.execute.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useNearbyAeds());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    await act(() => result.current.refresh());

    expect(result.current.error).toBeNull();
  });
});
