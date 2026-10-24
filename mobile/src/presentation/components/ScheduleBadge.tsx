import React from "react";
import { IonBadge } from "@ionic/react";

import { Aed } from "../../domain/models/Aed";

interface ScheduleBadgeProps {
  schedule: Aed["schedule"];
}

const ScheduleBadge: React.FC<ScheduleBadgeProps> = ({ schedule }) => {
  if (!schedule) return null;

  if (schedule.has_24h_surveillance) {
    return <IonBadge color="light">Vigilancia 24 h</IonBadge>;
  }

  // Device-local time and surveillance do not establish whether an AED is accessible.
  return <IonBadge color="light">Consultar horario</IonBadge>;
};

export default ScheduleBadge;
