import React, { useState } from "react";
import { useJsApiLoader, Autocomplete, GoogleMap, MarkerF, CircleF } from "@react-google-maps/api";

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

  const inputRef = React.useRef<HTMLInputElement>(null);

  const onLoadAutocomplete = (autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      let newLat = lat;
      let newLng = lng;
      let newAddress = address;

      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        newLat = place.geometry.location.lat();
        newLng = place.geometry.location.lng();
      }
      if (place.formatted_address) {
        newAddress = place.formatted_address;
      } else if (place.name) {
        newAddress = place.name;
      }

      if (inputRef.current) {
        inputRef.current.value = newAddress;
      }

      onChange(newLat, newLng, newAddress, radiusKm);
    }
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!isEditing || !e.latLng) return;
    const clickLat = e.latLng.lat();
    const clickLng = e.latLng.lng();

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat: clickLat, lng: clickLng } }, (results, status) => {
      let newAddress = address;
      if (status === "OK" && results && results[0]) {
        newAddress = results[0].formatted_address;
      } else {
        newAddress = `${clickLat.toFixed(4)}, ${clickLng.toFixed(4)}`;
      }

      if (inputRef.current) {
        inputRef.current.value = newAddress;
      }

      onChange(clickLat, clickLng, newAddress, radiusKm);
    });
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
        <Autocomplete onLoad={onLoadAutocomplete} onPlaceChanged={onPlaceChanged}>
          <input
            ref={inputRef}
            defaultValue={address}
            type="text"
            placeholder="Search for a location..."
            className="w-full h-9 border border-input bg-background px-3 py-1 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </Autocomplete>
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
