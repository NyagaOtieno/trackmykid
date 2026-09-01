declare module 'react-leaflet' {
  import { LatLngExpression, Icon as LeafletIcon } from 'leaflet';
  
  export interface MapContainerProps {
    center: LatLngExpression;
    zoom: number;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
  
  export interface TileLayerProps {
    attribution: string;
    url: string;
  }
  
  export interface MarkerProps {
    position: LatLngExpression;
    icon?: LeafletIcon;
    children?: React.ReactNode;
  }
  
  export interface PopupProps {
    children?: React.ReactNode;
  }
  
  export const MapContainer: React.FC<MapContainerProps>;
  export const TileLayer: React.FC<TileLayerProps>;
  export const Marker: React.FC<MarkerProps>;
  export const Popup: React.FC<PopupProps>;
}
