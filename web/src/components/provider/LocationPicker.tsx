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
            <div
                style={{
                    height: "300px",
                    width: "100%",
                    backgroundColor: "var(--bg-surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                }}
            >
                <span style={{ color: "var(--text-muted)" }}>Loading map...</span>
            </div>
        );
    }

    const defaultCenter = { lat: 6.9271, lng: 79.8612 };
    const center = lat !== null && lng !== null ? { lat, lng } : defaultCenter;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="wizard-field" style={{ marginBottom: "1rem" }}>
                <label>Travel Radius (kilometers)</label>
                <div className="radius-slider-container" style={{ opacity: isEditing ? 1 : 0.5 }}>
                    <input
                        type="range"
                        className="radius-slider"
                        min="5"
                        max="100"
                        step="5"
                        value={radiusKm}
                        onChange={handleRadiusChange}
                        disabled={!isEditing}
                    />
                    <span className="radius-value" style={{ marginLeft: "12px", fontWeight: "600" }}>
                        {radiusKm} km
                    </span>
                </div>
            </div>

            <div className="wizard-field" style={{ marginBottom: 0 }}>
                <label>
                    Map Location{" "}
                    {isEditing && (
                        <span
                            style={{
                                fontSize: "0.85em",
                                color: "var(--text-muted)",
                                marginLeft: "8px",
                                fontWeight: "normal",
                            }}
                        >
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
                        style={{
                            width: "100%",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            boxSizing: "border-box",
                        }}
                    />
                </Autocomplete>
            )}

            <div
                style={{
                    height: "300px",
                    width: "100%",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid var(--border-color)",
                }}
            >
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
                                    fillColor: "var(--accent)",
                                    fillOpacity: 0.15,
                                    strokeColor: "var(--accent)",
                                    strokeOpacity: 0.8,
                                    strokeWeight: 2,
                                    clickable: false,
                                    editable: false,
                                    zIndex: 1
                                }}
                            />
                        </>
                    )}
                </GoogleMap>
            </div>

            {address && (
                <div style={{ fontSize: "0.9em", color: "var(--text-muted)", marginTop: "4px" }}>
                    <strong>Selected Area: </strong> {address}
                </div>
            )}
        </div>
    );
}
