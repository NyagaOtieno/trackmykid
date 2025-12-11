declare module "react-leaflet" {
  import { ComponentType, ReactNode } from "react";

  export interface MapContainerProps {
    center?: any;
    zoom?: number;
    className?: string;
    style?: any;
    zoomControl?: boolean;
    scrollWheelZoom?: boolean;
    children?: ReactNode;
  }

  export interface MarkerProps {
    position: any;
    icon?: any;
    children?: ReactNode;
    eventHandlers?: Record<string, (...args: any[]) => void>;
    zIndexOffset?: number;
    ref?: any;
  }

  export interface PopupProps {
    children?: ReactNode;
    maxWidth?: number;
    minWidth?: number;
    autoPan?: boolean;
    autoPanPadding?: any;
    closeButton?: boolean;
    className?: string;
    offset?: any;
  }

  export const MapContainer: ComponentType<MapContainerProps>;
  export const TileLayer: ComponentType<any>;
  export const Marker: ComponentType<MarkerProps>;
  export const Popup: ComponentType<PopupProps>;
  export const Polyline: ComponentType<any>;
  export function useMap(): any;
  export function useMapEvents(handlers: any): any;
}
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
