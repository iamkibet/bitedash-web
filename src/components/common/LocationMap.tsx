import { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { Button } from './Button';

interface LocationMapProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export const LocationMap = ({ latitude, longitude, onLocationSelect, className = '' }: LocationMapProps) => {
  const [position, setPosition] = useState<[number, number]>([-1.2921, 36.8219]); // Default: Nairobi center
  const [isLocating, setIsLocating] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Load Leaflet from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet is already loaded
    if (window.L) {
      setIsMapLoaded(true);
      setIsMounted(true);
      return;
    }

    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setIsMapLoaded(true);
      setIsMounted(true);
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }
    };
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !window.L) return;

    const [lat, lng] = position;

    // Initialize map
    if (!mapInstanceRef.current) {
      const map = window.L.map(mapRef.current).setView([lat, lng], 13);

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add marker
      const marker = window.L.marker([lat, lng], { draggable: true }).addTo(map);

      // Handle marker drag
      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
      });

      // Handle map click
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        marker.setLatLng([lat, lng]);
        onLocationSelect(lat, lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Update map center and marker position
      mapInstanceRef.current.setView([lat, lng], 13);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }
  }, [isMapLoaded, position, onLocationSelect]);

  // Handle initial location or geolocation
  useEffect(() => {
    if (!isMounted) return;
    
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
    } else if (!latitude && !longitude) {
      // Try to get user's current location
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude: lat, longitude: lng } = position.coords;
            setPosition([lat, lng]);
            onLocationSelect(lat, lng);
            setIsLocating(false);
          },
          () => {
            setIsLocating(false);
          },
          { timeout: 10000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      }
    }
  }, [latitude, longitude, isMounted, onLocationSelect]);

  const handleGetCurrentLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng } = position.coords;
          setPosition([lat, lng]);
          onLocationSelect(lat, lng);
          setIsLocating(false);
        },
        () => {
          setIsLocating(false);
          alert('Unable to get your location. Please click on the map to select a location.');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  if (!isMounted) {
    return (
      <div className={`relative ${className}`}>
        <div className="h-64 sm:h-80 md:h-96 w-full rounded-lg overflow-hidden border-2 border-gray-300 shadow-md bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="mb-3 flex flex-col sm:flex-row gap-2 sm:items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGetCurrentLocation}
          isLoading={isLocating}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2"
        >
          <Navigation className="h-4 w-4 shrink-0" aria-hidden />
          <span>{isLocating ? 'Locating...' : 'Use My Location'}</span>
        </Button>
        <p className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
          Click on the map or drag the marker to set your store location
        </p>
      </div>

      <div
        ref={mapRef}
        className="h-64 sm:h-80 md:h-96 w-full rounded-lg overflow-hidden border-2 border-gray-300 shadow-md relative z-0"
        style={{ minHeight: '256px' }}
      >
        {!isMapLoaded && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
      </div>
      
      {position && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">Location Selected</span>
          </div>
          <p className="text-xs text-green-700 font-mono">
            Latitude: {Number(position[0]).toFixed(6)}, Longitude: {Number(position[1]).toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
};
