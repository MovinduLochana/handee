import React, { useState, useEffect } from "react";
import { useJsApiLoader, Autocomplete, GoogleMap, MarkerF, CircleF } from "@react-google-maps/api";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Library = "places";
const MAP_LIBRARIES: Library[] = ["places"];

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  address: string;
  radiusKm: number;
  isEditing: boolean;
  onChange: (lat: number | null, lng: number | null, address: string, radiusKm: number) => void;
}

export default function LocationPicker({
  lat,
  lng,
  address,
  radiusKm,
  isEditing,
  onChange,
}: LocationPickerProps) {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(address);
  const [isSearching, setIsSearching] = useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(address);
  }, [address]);

  const fallbackGeocode = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const item = data[0];
          const newLat = parseFloat(item.lat);
          const newLng = parseFloat(item.lon);
          const newAddress = item.display_name || query;
          setInputValue(newAddress);
          onChange(newLat, newLng, newAddress, radiusKm);
          return;
        }
      }
    } catch {
      // ignore network errors
    } finally {
      setIsSearching(false);
    }
  };

  const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
    try {
      autocompleteInstance.setFields(["geometry", "formatted_address", "name"]);
    } catch {
      // ignore
    }
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      try {
        const place = autocomplete.getPlace();
        let newLat = lat;
        let newLng = lng;
        let newAddress = inputValue;

        if (place && place.geometry && place.geometry.location) {
          newLat = place.geometry.location.lat();
          newLng = place.geometry.location.lng();
        }
        if (place && place.formatted_address) {
          newAddress = place.formatted_address;
        } else if (place && place.name) {
          newAddress = place.name;
        }

        if (newAddress) {
          setInputValue(newAddress);
        }

        if (newLat !== null && newLng !== null) {
          onChange(newLat, newLng, newAddress, radiusKm);
          return;
        }
      } catch {
        // Fall back to Nominatim if getPlace fails
      }
    }

    if (inputValue.trim()) {
      fallbackGeocode(inputValue.trim());
    }
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputValue.trim()) {
      fallbackGeocode(inputValue.trim());
    }
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isEditing || !e.latLng) return;
    const clickLat = e.latLng.lat();
    const clickLng = e.latLng.lng();

    try {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickLat, lng: clickLng } }, async (results, status) => {
        if (status === "OK" && results && results[0]) {
          const newAddress = results[0].formatted_address;
          setInputValue(newAddress);
          onChange(clickLat, clickLng, newAddress, radiusKm);
        } else {
          // Fallback reverse geocoding via OpenStreetMap
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickLat}&lon=${clickLng}`,
              { headers: { "Accept-Language": "en" } },
            );
            if (res.ok) {
              const data = await res.json();
              if (data && data.display_name) {
                setInputValue(data.display_name);
                onChange(clickLat, clickLng, data.display_name, radiusKm);
                return;
              }
            }
          } catch {
            // ignore
          }

          const fallbackAddr = `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`;
          setInputValue(fallbackAddr);
          onChange(clickLat, clickLng, fallbackAddr, radiusKm);
        }
      });
    } catch {
      const fallbackAddr = `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`;
      setInputValue(fallbackAddr);
      onChange(clickLat, clickLng, fallbackAddr, radiusKm);
    }
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(lat, lng, address, parseInt(e.target.value) || 5);
  };

  if (!isLoaded) {
    return (
      <div className="h-[300px] w-full bg-muted/40 flex items-center justify-center border border-border">
        <span className="text-sm text-muted-foreground">Loading map...</span>
      </div>
    );
  }

  const defaultCenter = { lat: 6.9271, lng: 79.8612 };
  const center = lat !== null && lng !== null ? { lat, lng } : defaultCenter;

  return (
    <div className="flex flex-col gap-3">
      <div className="wizard-field mb-2">
        <label className="text-sm font-semibold text-foreground block mb-1.5">
          Travel Radius (kilometers)
        </label>
        <div
          className={`radius-slider-container flex items-center gap-3 ${isEditing ? "opacity-100" : "opacity-50"}`}
        >
          <input
            type="range"
            className="radius-slider flex-1 accent-primary cursor-pointer"
            min="5"
            max="100"
            step="5"
            value={radiusKm}
            onChange={handleRadiusChange}
            disabled={!isEditing}
          />
          <span className="radius-value font-semibold text-sm text-foreground shrink-0 w-16 text-right">
            {radiusKm} km
          </span>
        </div>
      </div>

      <div className="wizard-field mb-1">
        <label className="text-sm font-semibold text-foreground block">
          Map Location{" "}
          {isEditing && (
            <span className="text-xs text-muted-foreground ml-2 font-normal">
              (Search or click on the map to pin your base location)
            </span>
          )}
        </label>
      </div>

      {isEditing && (
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  onChange(lat, lng, e.target.value, radiusKm);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleManualSearch();
                  }
                }}
                type="text"
                placeholder="Search for a location or city..."
                className="w-full h-9 border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </Autocomplete>
          </div>
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isSearching || !inputValue.trim()}
            className="h-9 px-3 gap-1.5 shrink-0 rounded-none cursor-pointer"
          >
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span className="text-xs">Search</span>
          </Button>
        </form>
      )}

      <div className="h-[300px] w-full overflow-hidden border border-border">
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={center}
          zoom={lat && lng ? 11 : 12}
          onClick={onMapClick}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            scaleControl: true,
            gestureHandling: isEditing ? "auto" : "none",
          }}
        >
          {lat !== null && lng !== null && (
            <>
              <MarkerF position={{ lat, lng }} />
              <CircleF
                center={{ lat, lng }}
                radius={radiusKm * 1000}
                options={{
                  fillColor: "var(--primary)",
                  fillOpacity: 0.15,
                  strokeColor: "var(--primary)",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  clickable: false,
                  editable: false,
                  zIndex: 1,
                }}
              />
            </>
          )}
        </GoogleMap>
      </div>

      {address && (
        <div className="text-xs text-muted-foreground mt-1">
          <strong className="text-foreground font-semibold">Selected Area: </strong> {address}
        </div>
      )}
    </div>
  );
}
