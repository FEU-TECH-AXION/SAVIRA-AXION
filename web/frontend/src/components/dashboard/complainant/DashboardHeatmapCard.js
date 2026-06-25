"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./DashboardDataCards.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

import {
  loadChoropleth,
  setupHoverInteraction,
  removeWaterLayer,
} from "@/lib/choroplethUtils";

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
      removeWaterLayer(map);
      loadChoropleth(map, locations, "city");
      setupHoverInteraction(map);
    });

    return () => {
      if (map._choroplethPopup) map._choroplethPopup.remove();
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
