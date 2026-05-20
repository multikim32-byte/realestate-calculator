// Minimal Kakao Maps SDK type declarations for this project
// Official types are not published; this covers the APIs actually used.

export {};

declare global {
  type KakaoLatLng = { getLat(): number; getLng(): number };
  type KakaoLatLngBounds = { extend(latlng: KakaoLatLng): void };
  type KakaoMapInstance = {
    getCenter(): KakaoLatLng;
    setCenter(latlng: KakaoLatLng): void;
    getLevel(): number;
    setLevel(level: number, options?: { animate?: boolean }): void;
    getBounds(): { getSouthWest(): KakaoLatLng; getNorthEast(): KakaoLatLng };
    setBounds(bounds: KakaoLatLngBounds): void;
    addOverlayMapTypeId(type: number): void;
    removeOverlayMapTypeId(type: number): void;
    panTo(latlng: KakaoLatLng): void;
    relayout(): void;
  };
  type KakaoMarker = { setMap(map: KakaoMapInstance | null): void; getPosition(): KakaoLatLng };
  type KakaoCustomOverlay = { setMap(map: KakaoMapInstance | null): void; setPosition(latlng: KakaoLatLng): void };
  type KakaoInfoWindow = { open(map: KakaoMapInstance, marker: KakaoMarker): void; close(): void };
  type KakaoGeocoder = {
    addressSearch(addr: string, cb: (result: KakaoAddressResult[], status: string) => void): void;
    coord2RegionCode(lng: number, lat: number, cb: (result: KakaoRegionResult[], status: string) => void): void;
  };
  type KakaoPlaces = {
    keywordSearch(keyword: string, cb: (result: KakaoPlaceResult[], status: string) => void, options?: { location?: KakaoLatLng; radius?: number }): void;
  };
  type KakaoAddressResult = { address_name: string; x: string; y: string };
  type KakaoRegionResult = { region_type: string; region_1depth_name: string; region_2depth_name: string };
  type KakaoPlaceResult = { place_name: string; address_name: string; x: string; y: string };

  interface KakaoMapsStatic {
    load(callback: () => void): void;
    Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
    LatLng: new (lat: number | string, lng: number | string) => KakaoLatLng;
    LatLngBounds: new () => KakaoLatLngBounds;
    Marker: new (options: { position: KakaoLatLng; map?: KakaoMapInstance; image?: unknown; title?: string }) => KakaoMarker;
    MarkerImage: new (src: string, size: unknown, options?: { offset?: unknown }) => unknown;
    Size: new (width: number, height: number) => unknown;
    Point: new (x: number, y: number) => unknown;
    CustomOverlay: new (options: { position?: KakaoLatLng; content: HTMLElement | string; map?: KakaoMapInstance | null; zIndex?: number; yAnchor?: number }) => KakaoCustomOverlay;
    InfoWindow: new (options?: { content?: string; removable?: boolean }) => KakaoInfoWindow;
    MarkerClusterer: new (options: { map: KakaoMapInstance; averageCenter?: boolean; minLevel?: number; styles?: unknown[] }) => { clear(): void; addMarker(m: KakaoMarker): void; addMarkers(m: KakaoMarker[], b?: boolean): void };
    MapTypeId: { HYBRID: number; ROADMAP: number };
    event: {
      addListener(target: KakaoMapInstance | KakaoMarker, type: string, handler: (...args: unknown[]) => void): void;
      removeListener(target: KakaoMapInstance | KakaoMarker, type: string, handler: (...args: unknown[]) => void): void;
    };
    services: {
      Geocoder: new () => KakaoGeocoder;
      Places: new () => KakaoPlaces;
      Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    };
  }

  interface DaumPostcodeResult {
    roadAddress: string;
    jibunAddress: string;
    autoJibunAddress: string;
    sido: string;
    sigungu: string;
    bname: string;
    buildingName: string;
    apartment: string;
  }

  interface Window {
    kakao: { maps: KakaoMapsStatic };
    daum?: {
      Postcode: new (options: {
        oncomplete: (data: DaumPostcodeResult) => void;
        onresize?: (size: { width: number; height: number }) => void;
      }) => { open: () => void };
    };
  }
}
