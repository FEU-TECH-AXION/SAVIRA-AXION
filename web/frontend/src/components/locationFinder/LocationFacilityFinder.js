"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiExternalLink, FiMapPin, FiNavigation, FiSearch } from "react-icons/fi";
import { MdLocalHospital } from "react-icons/md";
import { RiPoliceBadgeFill } from "react-icons/ri";
import styles from "./LocationFacilityFinder.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_SCRIPT_ID = "mapbox-gl-js";
const MAPBOX_CSS_ID = "mapbox-gl-css";

// Mapbox Search Box category slugs — these are the official IDs
const SERVICE_COPY = {
  hospital: {
    icon: <MdLocalHospital />,
    eyebrow: "Nearby Healthcare",
    title: "Find Hospitals",
    prompt: "Please enter location to find hospitals in that area",
    searchPlaceholder: "Enter city, barangay, landmark, or address",
    // Comma-separated category slugs — Search Box supports multi-category
    categories: ["hospital", "clinic", "emergency_room_and_urgent_care_facility"],
    keyword: "hospital",
    empty: "Search for a location to see nearby hospitals.",
    color: "#E8663A", // Orange for the facility, Teal for the user's location
  },
  police: {
    icon: <RiPoliceBadgeFill />,
    eyebrow: "Nearby Public Safety",
    title: "Find Police Stations",
    prompt: "Please enter location to find police stations in that area",
    searchPlaceholder: "Enter city, barangay, landmark, or address",
    categories: ["police_station", "police"],
    keyword: "PNP",
    empty: "Search for a location to see nearby police stations.",
    color: "#E8663A",
  },
};

// --- Mapbox GL loader (unchanged) ---
function loadMapbox() {
  if (!MAPBOX_TOKEN) return Promise.reject(new Error("Mapbox token is missing."));
  if (window.mapboxgl) return Promise.resolve(window.mapboxgl);

  return new Promise((resolve, reject) => {
    let script = document.getElementById(MAPBOX_SCRIPT_ID);
    if (!document.getElementById(MAPBOX_CSS_ID)) {
      const link = document.createElement("link");
      link.id = MAPBOX_CSS_ID;
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css";
      document.head.appendChild(link);
    }
    if (!script) {
      script = document.createElement("script");
      script.id = MAPBOX_SCRIPT_ID;
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js";
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(window.mapboxgl), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Mapbox.")), { once: true });
  });
}

// --- Geocoding API: kept ONLY for location (address/place) autocomplete ---
async function geocodeSearch(query, params = {}) {
  const search = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country: "PH",
    limit: "6",
    ...params,
  });
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${search}`
  );
  if (!res.ok) throw new Error("Location search failed.");
  return res.json();
}

// --- Search Box API: used for POI/facility category search ---
async function searchBoxCategory(categorySlug, proximity, bbox) {
  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    proximity: proximity.join(","),
    bbox,
    limit: "10",
    country: "PH",
    language: "en",
  });
  const res = await fetch(
    `https://api.mapbox.com/search/searchbox/v1/category/${encodeURIComponent(categorySlug)}?${params}`
  );
  if (!res.ok) throw new Error(`Category search failed for: ${categorySlug}`);
  return res.json();
}

function buildBbox(center, radius = 0.05) {
  const [lng, lat] = center;
  return [lng - radius, lat - radius, lng + radius, lat + radius].join(",");
}

function distanceKm(from, to) {
  if (!from || !to) return null;
  const [lng1, lat1] = from.map(Number);
  const [lng2, lat2] = to.map(Number);
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

export default function LocationFacilityFinder({ service = "hospital" }) {
  const copy = SERVICE_COPY[service] || SERVICE_COPY.hospital;
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef([]);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestStatus, setSuggestStatus] = useState("idle");
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [status, setStatus] = useState(MAPBOX_TOKEN ? "idle" : "missingToken");
  const [error, setError] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const sortedFacilities = useMemo(() => {
    if (!searchedLocation) return facilities;
    return [...facilities].sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [facilities, searchedLocation]);

  // Autocomplete suggestions — still uses Geocoding API (correct use case)
  useEffect(() => {
    const trimmed = query.trim();
    if (
      !MAPBOX_TOKEN ||
      !isSearchFocused ||
      selectedSuggestion?.place_name === query ||
      trimmed.length < 2
    ) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestStatus("loading");
      try {
        const data = await geocodeSearch(trimmed, {
          autocomplete: "true",
          types: "place,locality,neighborhood,address,poi",
        });
        if (cancelled) return;
        setSuggestions(data.features || []);
        setActiveSuggestionIndex(-1);
        setSuggestStatus("success");
      } catch (_) {
        if (cancelled) return;
        setSuggestions([]);
        setActiveSuggestionIndex(-1);
        setSuggestStatus("error");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSearchFocused, query, selectedSuggestion]);

  // Map init
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;
    loadMapbox()
      .then((mapboxgl) => {
        if (mapRef.current) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: [121.0376, 14.5995],
          zoom: 10,
        });
      })
      .catch((err) => setError(err.message));

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // Update markers when results change
  useEffect(() => {
    if (!mapRef.current || !searchedLocation) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const mapboxgl = window.mapboxgl;
    const bounds = new mapboxgl.LngLatBounds();
    bounds.extend(searchedLocation.center);

    const locationMarker = new mapboxgl.Marker({ color: "#037F81" })
      .setLngLat(searchedLocation.center)
      .setPopup(new mapboxgl.Popup().setText(searchedLocation.name))
      .addTo(mapRef.current);
    markersRef.current.push(locationMarker);

    sortedFacilities.forEach((facility) => {
      bounds.extend(facility.center);
      const marker = new mapboxgl.Marker({ color: copy.color })
        .setLngLat(facility.center)
        .setPopup(
          new mapboxgl.Popup().setHTML(
            `<strong>${facility.name}</strong><br/>${facility.address}`
          )
        )
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    mapRef.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: sortedFacilities.length ? 14 : 12,
      duration: 700,
    });
  }, [copy.color, searchedLocation, sortedFacilities]);

  // Core: fetch facilities via Search Box /category endpoint
  async function searchNearbyFacilities(location) {
    const proximity = location.center;
    const bbox = buildBbox(location.center);

    // Fetch all category slugs in parallel
    const categoryPromises = copy.categories.map((slug) =>
      searchBoxCategory(slug, proximity, bbox).catch(() => ({ features: [] }))
    );

    // Supplementary text search via Geocoding API to catch un-categorized POIs
    const textPromise = copy.keyword
      ? geocodeSearch(copy.keyword, {
          proximity: proximity.join(","),
          bbox,
          types: "poi",
          limit: "10",
        }).catch(() => ({ features: [] }))
      : Promise.resolve({ features: [] });

    const results = await Promise.all([...categoryPromises, textPromise]);

    const seen = new Set();
    return results
      .flatMap((data) => data.features || [])
      .filter((f) => f.geometry?.coordinates?.length === 2 || f.center?.length === 2)
      .map((f) => {
        const coords = f.geometry?.coordinates || f.center;
        return {
          // Geocoding API returns id directly, Search Box returns properties.mapbox_id
          id: f.id || f.properties?.mapbox_id || `${f.properties?.name || f.text}-${coords.join(",")}`,
          name: f.properties?.name || f.text || "Unknown",
          address:
            f.properties?.full_address ||
            f.properties?.place_formatted ||
            f.properties?.address ||
            f.place_name ||
            "Address unavailable",
          center: coords,
          distance: distanceKm(proximity, coords),
        };
      })
      .filter((f) => {
        const key = `${f.name}-${f.center.join(",")}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
      .slice(0, 12);
  }

  async function runSearch(locationFeature) {
    if (!MAPBOX_TOKEN) { setStatus("missingToken"); return; }
    const trimmed = query.trim();
    if (!locationFeature && !trimmed) return;

    setStatus("loading");
    setError("");
    setFacilities([]);
    setSuggestions([]);

    try {
      let location = locationFeature;
      if (!location) {
        const data = await geocodeSearch(trimmed, {
          types: "place,locality,neighborhood,address,poi",
          limit: "1",
        });
        location = data.features?.[0];
      }
      if (!location) throw new Error("We could not find that location.");

      const mapped = await searchNearbyFacilities(location);
      setSearchedLocation({
        name: location.place_name || location.text,
        center: location.center,
      });
      setFacilities(mapped);
      setStatus(mapped.length ? "success" : "empty");
    } catch (err) {
      setError(err.message || "Unable to search this location.");
      setStatus("error");
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    runSearch(selectedSuggestion);
  }

  function handleSuggestionSelect(feature) {
    setSelectedSuggestion(feature);
    setQuery(feature.place_name || feature.text);
    setSuggestions([]);
    setActiveSuggestionIndex(-1);
    setSuggestStatus("idle");
    runSearch(feature);
  }

  function handleSuggestionKeyDown(event) {
    if (suggestions.length === 0) {
      if (event.key === "Escape") setSuggestions([]);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) =>
        index <= 0 ? suggestions.length - 1 : index - 1
      );
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      handleSuggestionSelect(suggestions[activeSuggestionIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSuggestions([]);
      setActiveSuggestionIndex(-1);
    }
  }

  // Auto-locate on mount
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLocating(false);
          const locationFeature = {
            place_name: "Your Current Location",
            text: "Your Current Location",
            center: [position.coords.longitude, position.coords.latitude],
          };
          setQuery("Your Current Location");
          runSearch(locationFeature);
        },
        (err) => {
          setIsLocating(false);
          console.warn("Geolocation error:", err.message);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // JSX is identical to your original — no UI changes needed
  return (
    <section className={styles.finder}>
      <div className={styles.searchPanel}>
        <div className={styles.headingRow}>
          <span className={styles.serviceIcon} style={{ color: copy.color }}>{copy.icon}</span>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 className={styles.title}>{copy.title}</h1>
          </div>
        </div>

        <form className={styles.searchForm} onSubmit={handleSearch}>
          <label className={styles.searchLabel} htmlFor={`${service}-location`}>
            {copy.prompt}
          </label>
          <div className={styles.searchControls}>
            <input
              id={`${service}-location`}
              className={styles.searchInput}
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                setSelectedSuggestion(null);
                setActiveSuggestionIndex(-1);
                if (v.trim().length < 2) { setSuggestions([]); setSuggestStatus("idle"); }
              }}
              onKeyDown={handleSuggestionKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setIsSearchFocused(false);
                setSuggestions([]);
                setActiveSuggestionIndex(-1);
                setSuggestStatus("idle");
              }}
              placeholder={copy.searchPlaceholder}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestions.length > 0}
              aria-controls={`${service}-location-suggestions`}
              aria-activedescendant={
                activeSuggestionIndex >= 0
                  ? `${service}-location-suggestion-${activeSuggestionIndex}`
                  : undefined
              }
              autoComplete="off"
            />
            <button className={styles.searchButton} type="submit" disabled={status === "loading" || isLocating}>
              <FiSearch />
              {status === "loading" || isLocating ? "Searching" : "Search"}
            </button>
          </div>
          {(suggestions.length > 0 || suggestStatus === "loading") && (
            <div
              id={`${service}-location-suggestions`}
              className={styles.suggestions}
              role="listbox"
            >
              {suggestStatus === "loading" && (
                <div className={styles.suggestionMeta}>Finding suggestions...</div>
              )}
              {suggestions.map((f, index) => (
                <button
                  id={`${service}-location-suggestion-${index}`}
                  key={f.id}
                  type="button"
                  className={`${styles.suggestionItem} ${
                    activeSuggestionIndex === index ? styles.suggestionItemActive : ""
                  }`}
                  role="option"
                  aria-selected={activeSuggestionIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveSuggestionIndex(index)}
                  onClick={() => handleSuggestionSelect(f)}
                >
                  <FiMapPin />
                  <span>{f.place_name || f.text}</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {status === "missingToken" && (
          <div className={styles.notice}>
            Add `NEXT_PUBLIC_MAPBOX_TOKEN` to enable live map and nearby-place search.
          </div>
        )}
        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.resultsHeader}>
          {isLocating ? (
            <span>Locating you...</span>
          ) : (
            <span>{searchedLocation ? `Results near ${searchedLocation.name}` : copy.empty}</span>
          )}
          {sortedFacilities.length > 0 && <strong>{sortedFacilities.length} found</strong>}
        </div>

        {status === "empty" && (
          <div className={styles.emptyState}>
            No nearby {service === "hospital" ? "hospitals" : "police stations"} found for that area.
            Try a more specific landmark, barangay, or city.
          </div>
        )}

        <div className={styles.resultList}>
          {sortedFacilities.map((facility) => (
            <article key={facility.id} className={styles.resultItem}>
              <div className={styles.resultIcon} style={{ color: copy.color }}>{copy.icon}</div>
              <div className={styles.resultBody}>
                <h2>{facility.name}</h2>
                <p><FiMapPin /> {facility.address}</p>
                {facility.distance !== null && (
                  <span className={styles.distance}>{facility.distance.toFixed(1)} km away</span>
                )}
              </div>
              <a
                className={styles.directionsLink}
                href={`https://www.google.com/maps/search/?api=1&query=${facility.center[1]},${facility.center[0]}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open directions to ${facility.name}`}
              >
                <FiNavigation />
              </a>
            </article>
          ))}
        </div>
      </div>

      <div className={styles.mapPanel}>
        <div ref={mapContainerRef} className={styles.mapCanvas}>
          {!MAPBOX_TOKEN && (
            <div className={styles.mapFallback}>
              <FiExternalLink /> Map preview needs a Mapbox token.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
