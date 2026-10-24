import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

import { AedCluster } from "../../../domain/models/Aed";

interface ClusterMarkerProps {
  cluster: AedCluster;
  onZoomToCluster: (cluster: AedCluster) => void;
}

function getClusterSize(count: number): number {
  if (count < 20) return 40;
  if (count < 50) return 48;
  if (count < 100) return 56;
  return 64;
}

const ClusterMarker: React.FC<ClusterMarkerProps> = React.memo(({ cluster, onZoomToCluster }) => {
  const size = getClusterSize(cluster.count);
  const color = "#247f52";

  const icon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: ${size > 48 ? 16 : 14}px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          border: 3px solid rgba(255,255,255,0.8);
        ">${cluster.count}</div>`,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [size, color, cluster.count]
  );

  return (
    <Marker
      position={[cluster.center.lat, cluster.center.lng]}
      icon={icon}
      eventHandlers={{
        click: () => onZoomToCluster(cluster),
      }}
    />
  );
});

ClusterMarker.displayName = "ClusterMarker";

export default ClusterMarker;
