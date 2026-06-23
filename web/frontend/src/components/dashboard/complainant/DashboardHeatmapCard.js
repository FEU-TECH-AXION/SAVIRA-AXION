"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./DashboardDataCards.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

function toFeatureCollection(locations) {
  return {
    type: "FeatureCollection",
    features: locations
      .filter((location) => location.coordinates)
      .map((location) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [location.coordinates.lng, location.coordinates.lat],
        },
        properties: {
          name: location.name,
          density: Number(location.density) || 0,
          intensity: Number(location.intensity) || 0,
        },
      })),
  };
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

    map.on("load", () => {
      map.addSource("dashboard-heatmap", {
        type: "geojson",
        data: toFeatureCollection(locations),
      });
      map.addLayer({
        id: "dashboard-heatmap-glow",
        type: "circle",
        source: "dashboard-heatmap",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "density"], 0, 3, 12, 30],
          "circle-color": [
            "interpolate", ["linear"], ["get", "intensity"],
            0, "#dbeafe",
            0.15, "#22c55e",
            0.3, "#eab308",
            0.5, "#f97316",
            0.7, "#ef4444",
          ],
          "circle-opacity": 0.65,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
        },
      });
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
