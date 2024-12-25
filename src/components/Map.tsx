'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet ikon sorunu için geçici çözüm
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapProps {
  coordinates: LatLngTuple;
  mapStyle?: 'streets' | 'satellite' | 'terrain';
}

const mapStyles = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
};

const mapAttributions = {
  streets: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  satellite: '&copy; <a href="https://www.arcgis.com/">ArcGIS</a>',
  terrain: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
};

export default function Map({ coordinates, mapStyle = 'streets' }: MapProps) {
  useEffect(() => {
    // Harita yüklendikten sonra yeniden boyutlandırma tetikle
    const timeoutId = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 200);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <MapContainer
      center={coordinates}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution={mapAttributions[mapStyle]}
        url={mapStyles[mapStyle]}
      />
      <Marker position={coordinates}>
        <Popup>
          <div className="text-center">
            <p className="font-medium">Fotoğrafın çekildiği konum</p>
            <p className="text-sm text-gray-600">
              {coordinates[0].toFixed(6)}°N, {coordinates[1].toFixed(6)}°E
            </p>
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
} 