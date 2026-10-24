import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Aed } from "../../domain/models/Aed";
import ScheduleBadge from "../../presentation/components/ScheduleBadge";

const overnightSchedule: NonNullable<Aed["schedule"]> = {
  has_24h_surveillance: false,
  weekday_opening: "06:00",
  weekday_closing: "02:00",
  saturday_opening: null,
  saturday_closing: null,
  sunday_opening: null,
  sunday_closing: null,
};

afterEach(cleanup);

describe("schedule information", () => {
  it("shouldNotDeclareAnOvernightLocationClosedWithoutItsTimezone", () => {
    render(<ScheduleBadge schedule={overnightSchedule} />);

    expect(screen.queryByText("Cerrado")).toBeNull();
    expect(screen.getByText("Consultar horario")).toBeTruthy();
  });

  it("shouldDescribeSurveillanceWithoutPromisingPublicAccess", () => {
    render(<ScheduleBadge schedule={{ ...overnightSchedule, has_24h_surveillance: true }} />);

    expect(screen.getByText("Vigilancia 24 h")).toBeTruthy();
    expect(screen.queryByText("Abierto")).toBeNull();
  });
});
