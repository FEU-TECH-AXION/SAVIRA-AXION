"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FiExternalLink, FiMapPin, FiNavigation, FiSearch } from "react-icons/fi";
import { MdLocalHospital } from "react-icons/md";
import { RiPoliceBadgeFill } from "react-icons/ri";
import styles from "./LocationFacilityFinder.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAPBOX_SCRIPT_ID = "mapbox-gl-js";
const MAPBOX_CSS_ID = "mapbox-gl-css";

const SERVICE_COPY = {
  hospital: {
    icon: <MdLocalHospital />,
    eyebrow: "Nearby Healthcare",
    title: "Find Hospitals",
    prompt: "Please enter location to find hospitals in that area",
    searchPlaceholder: "Enter city, barangay, landmark, or address",
    query: "hospital",
    queries: ["hospital", "medical center", "emergency hospital"],
    keywords: ["hospital", "medical", "clinic", "health", "emergency"],
    empty: "Search for a location to see nearby hospitals.",
    color: "#037F81",
  },
  police: {
    icon: <RiPoliceBadgeFill />,
    eyebrow: "Nearby Public Safety",
    title: "Find Police Stations",
    prompt: "Please enter location to find police stations in that area",
    searchPlaceholder: "Enter city, barangay, landmark, or address",
    query: "police station",
    queries: ["police station", "police", "precinct"],
    keywords: ["police", "station", "precinct"],
    empty: "Search for a location to see nearby police stations.",
    color: "#E8663A",
  },
};

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
    script.addEventListener("error", () => reject(new Error("Failed to load Mapbox.")), {
      once: true,
    });
  });
}

async function mapboxSearch(query, params = {}) {
  const search = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    country: "PH",
    limit: "10",
    ...params,
  });
  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${search}`
  );

  if (!res.ok) throw new Error("Location search failed.");
  return res.json();
}

function buildBbox(center, radius = 0.45) {
  const [lng, lat] = center;
  return [lng - radius, lat - radius, lng + radius, lat + radius].join(",");
}

function formatAddress(feature) {
  return feature.place_name || feature.text || "Address unavailable";
}

function isRelevantFacility(feature, keywords) {
  const haystack = [
    feature.text,
    feature.place_name,
    ...(feature.properties?.category?.split(",") || []),
    ...(feature.properties?.maki ? [feature.properties.maki] : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return keywords.some((keyword) => haystack.includes(keyword));
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
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [status, setStatus] = useState(MAPBOX_TOKEN ? "idle" : "missingToken");
  const [error, setError] = useState("");

  const sortedFacilities = useMemo(() => {
    if (!searchedLocation) return facilities;
    return [...facilities].sort((a, b) => (a.distance || 999) - (b.distance || 999));
  }, [facilities, searchedLocation]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!MAPBOX_TOKEN || selectedSuggestion?.place_name === query || trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setSuggestStatus("loading");
      try {
        const data = await mapboxSearch(trimmed, {
          autocomplete: "true",
          types: "place,locality,neighborhood,address,poi",
          limit: "6",
        });
        setSuggestions(data.features || []);
        setSuggestStatus("success");
      } catch (_) {
        setSuggestions([]);
        setSuggestStatus("error");
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedSuggestion]);

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
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !searchedLocation) return;

    markersRef.current.forEach((marker) => marker.remove());
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
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${facility.name}</strong><br/>${facility.address}`))
        .addTo(mapRef.current);
      markersRef.current.push(marker);
    });

    mapRef.current.fitBounds(bounds, {
      padding: 80,
      maxZoom: sortedFacilities.length ? 14 : 12,
      duration: 700,
    });
  }, [copy.color, searchedLocation, sortedFacilities]);

  async function searchNearbyFacilities(location) {
    const locationName = location.place_name || location.text || query;
    const searchPlans = copy.queries.flatMap((facilityQuery) => [
      {
        query: facilityQuery,
        params: {
          bbox: buildBbox(location.center),
          proximity: location.center.join(","),
          types: "poi",
          limit: "10",
        },
      },
      {
        query: `${facilityQuery} ${locationName}`,
        params: {
          proximity: location.center.join(","),
          types: "poi",
          limit: "10",
        },
      },
      {
        query: `${facilityQuery} near ${locationName}`,
        params: {
          proximity: location.center.join(","),
          types: "poi",
          limit: "10",
        },
      },
    ]);

    const searches = await Promise.all(
      searchPlans.map((plan) =>
        mapboxSearch(plan.query, plan.params).catch(() => ({ features: [] }))
      )
    );

    const seen = new Set();
    return searches
      .flatMap((data) => data.features || [])
      .filter((feature) => feature.center?.length === 2)
      .map((feature) => ({
        id: feature.id,
        name: feature.text,
        address: formatAddress(feature),
        center: feature.center,
        distance: distanceKm(location.center, feature.center),
      }))
      .filter((facility) => {
        const key = `${facility.name}-${facility.center.join(",")}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((facility) => {
        if (facility.distance === null) return true;
        if (facility.distance <= 25) return true;
        return isRelevantFacility(
          { text: facility.name, place_name: facility.address, properties: {} },
          copy.keywords
        );
      })
      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
      .slice(0, 12);
  }

  async function runSearch(locationFeature) {
    if (!MAPBOX_TOKEN) {
      setStatus("missingToken");
      return;
    }

    const trimmed = query.trim();
    if (!locationFeature && !trimmed) return;

    setStatus("loading");
    setError("");
    setFacilities([]);
    setSuggestions([]);

    try {
      let location = locationFeature;
      if (!location) {
        const locationData = await mapboxSearch(trimmed, {
          types: "place,locality,neighborhood,address,poi",
          limit: "1",
        });
        location = locationData.features?.[0];
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
    runSearch(feature);
  }

  return (
    <section className={styles.finder}>
      <div className={styles.searchPanel}>
        <div className={styles.headingRow}>
          <span className={styles.serviceIcon} style={{ color: copy.color }}>
            {copy.icon}
          </span>
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
              onChange={(event) => {
                const nextValue = event.target.value;
                setQuery(nextValue);
                setSelectedSuggestion(null);
                if (nextValue.trim().length < 2) {
                  setSuggestions([]);
                  setSuggestStatus("idle");
                }
              }}
              placeholder={copy.searchPlaceholder}
              autoComplete="off"
            />
            <button className={styles.searchButton} type="submit" disabled={status === "loading"}>
              <FiSearch />
              {status === "loading" ? "Searching" : "Search"}
            </button>
          </div>
          {(suggestions.length > 0 || suggestStatus === "loading") && (
            <div className={styles.suggestions} role="listbox">
              {suggestStatus === "loading" && (
                <div className={styles.suggestionMeta}>Finding suggestions...</div>
              )}
              {suggestions.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  className={styles.suggestionItem}
                  onClick={() => handleSuggestionSelect(feature)}
                >
                  <FiMapPin />
                  <span>{feature.place_name || feature.text}</span>
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
          <span>{searchedLocation ? `Results near ${searchedLocation.name}` : copy.empty}</span>
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
              <div className={styles.resultIcon} style={{ color: copy.color }}>
                {copy.icon}
              </div>
              <div className={styles.resultBody}>
                <h2>{facility.name}</h2>
                <p>
                  <FiMapPin /> {facility.address}
                </p>
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
              <FiExternalLink />
              Map preview needs a Mapbox token.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
