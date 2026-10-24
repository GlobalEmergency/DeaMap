import { IonButton, IonButtons, IonHeader, IonIcon, IonTitle, IonToolbar } from "@ionic/react";
import { callOutline } from "ionicons/icons";

export default function DiscoveryHeader() {
  return (
    <IonHeader className="discovery-header">
      <IonToolbar>
        <IonTitle>
          <span className="discovery-brand">
            <img src="/icon-96x96.png" width="32" height="32" alt="" />
            <span>
              DeaMap<small>Mapa de desfibriladores</small>
            </span>
          </span>
        </IonTitle>
        <IonButtons slot="end">
          <IonButton href="tel:112" color="danger" aria-label="Llamar al 112, emergencias">
            <IonIcon icon={callOutline} slot="start" aria-hidden="true" />
            112
          </IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
  );
}
