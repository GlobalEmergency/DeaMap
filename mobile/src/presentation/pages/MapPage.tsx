import React, { useCallback, useEffect, useState } from "react";
import {
  IonPage,
  IonContent,
  IonIcon,
  IonModal,
  IonButton,
  useIonToast,
  useIonViewDidEnter,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { locate, listOutline, openOutline } from "ionicons/icons";

import { AedMapMarker } from "../../domain/models/Aed";
import DiscoveryHeader from "../components/DiscoveryHeader";
import MapView from "../components/map/MapView";
import AedDetailSheet from "../components/AedDetailSheet";
import { useGeolocation } from "../hooks/useGeolocation";
import { useAnalytics } from "../store/AnalyticsContext";

const MapPage: React.FC = () => {
  const { analytics } = useAnalytics();
  const [selectedAed, setSelectedAed] = useState<AedMapMarker | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [flyToCounter, setFlyToCounter] = useState(0);
  const { position, getCurrentPosition, loading: geoLoading } = useGeolocation();
  const [presentToast] = useIonToast();
  const history = useHistory();

  // Auto-request geolocation on mount
  useEffect(() => {
    getCurrentPosition();
  }, [getCurrentPosition]);

  // Leaflet needs a resize event after Ionic page transition animation
  // to recalculate container dimensions and render tiles correctly
  useIonViewDidEnter(() => {
    window.dispatchEvent(new Event("resize"));
  });

  const handleMarkerSelect = useCallback((aed: AedMapMarker) => {
    setSelectedAed(aed);
    setShowDetail(true);
  }, []);

  const handleLocateMe = useCallback(async () => {
    void analytics.track("search");
    const coords = await getCurrentPosition();
    if (coords) {
      setFlyToCounter((c) => c + 1);
      presentToast({
        message: "Ubicación actualizada",
        duration: 1500,
        position: "top",
        color: "success",
      });
    } else {
      presentToast({
        message: "No se pudo obtener la ubicación",
        duration: 2000,
        position: "top",
        color: "warning",
      });
    }
  }, [analytics, getCurrentPosition, presentToast]);

  const handleViewDetail = useCallback(() => {
    if (selectedAed) {
      setShowDetail(false);
      history.push(`/dea/${selectedAed.id}`);
    }
  }, [selectedAed, history]);

  return (
    <IonPage>
      <DiscoveryHeader />
      <IonContent scrollY={false}>
        {/* Absolute positioning ensures the map gets real pixel dimensions
            inside Ionic's shadow DOM scroll container */}
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <MapView
            onMarkerSelect={handleMarkerSelect}
            userPosition={position}
            flyToCounter={flyToCounter}
          />
        </div>

        <div className="map-discovery-actions" slot="fixed">
          <p>Encuentra un DEA cerca de ti</p>
          <div>
            <IonButton onClick={handleLocateMe} disabled={geoLoading}>
              <IonIcon icon={locate} slot="start" aria-hidden="true" />
              {geoLoading ? "Buscando ubicación…" : "Cerca de mí"}
            </IonButton>
            <IonButton fill="outline" routerLink="/tabs/nearby">
              <IonIcon icon={listOutline} slot="start" aria-hidden="true" />
              Ver lista
            </IonButton>
          </div>
        </div>

        <IonModal
          isOpen={showDetail}
          onDidDismiss={() => setShowDetail(false)}
          initialBreakpoint={0.4}
          breakpoints={[0, 0.4, 0.8]}
          handleBehavior="cycle"
        >
          {selectedAed && (
            <IonContent>
              <AedDetailSheet aedId={selectedAed.id} name={selectedAed.name} />
              <div className="ion-padding" style={{ paddingTop: 0 }}>
                <IonButton expand="block" fill="outline" onClick={handleViewDetail}>
                  <IonIcon icon={openOutline} slot="start" />
                  Ver detalle completo
                </IonButton>
              </div>
            </IonContent>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default MapPage;
