"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./DashboardDataCards.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const GEOJSON_URL = "/geojson/ncr-cities.geojson";
const SOURCE_ID = "dashboard-choropleth-source";
const FILL_LAYER_ID = "dashboard-choropleth-fill";
const LINE_LAYER_ID = "dashboard-choropleth-line";

function normaliseName(value) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function joinDensityToGeoJSON(geojson, heatmapData) {
  const densityMap = new Map();
  (heatmapData || []).forEach((location) => {
    densityMap.set(normaliseName(location.name), {
      density: Number(location.density) || 0,
      intensity: Number(location.intensity) || 0,
    });
  });

  return {
    ...geojson,
    features: geojson.features.map((feature) => {
      const match = densityMap.get(normaliseName(feature.properties.name));
      return {
        ...feature,
        properties: {
          ...feature.properties,
          density: match?.density || 0,
          intensity: match?.intensity || 0,
        },
      };
    }),
  };
}

function computeBounds(geojson) {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      return;
    }

    coords.forEach(processCoords);
  }

  geojson.features.forEach((feature) => {
    if (feature.geometry?.coordinates) processCoords(feature.geometry.coordinates);
  });

  if (!Number.isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function addChoroplethLayers(map, geojsonWithDensity) {
  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: geojsonWithDensity,
  });

  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0, "rgba(219,234,254,0.55)",
        0.15, "rgba(34,197,94,0.60)",
        0.3, "rgba(234,179,8,0.68)",
        0.5, "rgba(249,115,22,0.75)",
        0.7, "rgba(239,68,68,0.82)",
        1.0, "rgba(185,28,28,0.90)",
      ],
      "fill-opacity": 1,
    },
  });

  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": "#ffffff",
      "line-width": 1.2,
      "line-opacity": 0.85,
    },
  });
}

export default function DashboardHeatmapCard() {
  const router = useRouter();
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHeatmap() {
      try {
        const response = await fetch(
          `${API_URL}/api/case_reports/heatmap/data?aggregation=city`,
          { cache: "no-store" }
        );
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Unable to load heatmap data.");
        setLocations(Array.isArray(body.data) ? body.data : []);
        setTotalReports(Number(body.totalReports) || 0);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }
    loadHeatmap();
  }, []);

  useEffect(() => {
    if (!mapNode.current || !MAPBOX_TOKEN || loading || error || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapNode.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [121.0244, 14.5995],
      zoom: 9.3,
      attributionControl: false,
      interactive: false,
    });
    mapRef.current = map;

    map.on("load", async () => {
      try {
        const geojsonResponse = await fetch(GEOJSON_URL);
        if (!geojsonResponse.ok) {
          throw new Error("Unable to load map boundaries.");
        }

        const geojson = await geojsonResponse.json();
        if (!mapRef.current || mapRef.current._removed) return;

        const enriched = joinDensityToGeoJSON(geojson, locations);
        addChoroplethLayers(map, enriched);

        const bounds = computeBounds(enriched);
        if (bounds) map.fitBounds(bounds, { padding: 18, duration: 0 });
      } catch (choroplethError) {
        setError(choroplethError.message);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [error, loading, locations]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span>Heatmap Overview</span>
        <button type="button" onClick={() => router.push("/heatmap")}>View &rarr;</button>
      </div>
      <div className={styles.mapBody}>
        {loading && <p className={styles.state}>Loading map...</p>}
        {error && <p className={styles.error}>{error}</p>}
        {!loading && !error && !MAPBOX_TOKEN && (
          <p className={styles.state}>Mapbox token is not configured.</p>
        )}
        <div
          ref={mapNode}
          className={`${styles.compactMap} ${loading || error || !MAPBOX_TOKEN ? styles.hiddenMap : ""}`}
        />
        {!loading && !error && MAPBOX_TOKEN && (
          <div className={styles.mapBadge}>{totalReports} reports shown</div>
        )}
      </div>
    </section>
  );
}
