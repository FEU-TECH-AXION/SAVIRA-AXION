"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { internalApiFetch } from "@/lib/internalApiFetch";
import styles from "./DashboardDataCards.module.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

import {
  loadChoropleth,
  setupHoverInteraction,
  removeWaterLayer,
} from "@/lib/choroplethUtils";

export default function DashboardHeatmapCard() {
  const mapNode = useRef(null);
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHeatmap() {
      try {
        const response = await internalApiFetch(
          "/api/case_reports/heatmap/data?aggregation=city",
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

    let animationFrame = 0;
    let resizeObserver = null;

    function initializeMap() {
      const node = mapNode.current;
      if (!node) return;

      const { width, height } = node.getBoundingClientRect();
      if (width < 1 || height < 1) {
        animationFrame = requestAnimationFrame(initializeMap);
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: node,
        style: "mapbox://styles/mapbox/light-v11",
        center: [121.0244, 14.5995],
        zoom: 9.3,
        attributionControl: false,
        interactive: false,
      });
      mapRef.current = map;

      const resizeMap = () => map.resize();
      resizeObserver =
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(resizeMap)
          : null;
      resizeObserver?.observe(node);

      map.on("load", () => {
        map.resize();
        removeWaterLayer(map);
        loadChoropleth(map, locations, "city");
        setupHoverInteraction(map);
      });

      map.once("idle", () => {
        map.resize();
      });
    }

    animationFrame = requestAnimationFrame(initializeMap);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      const map = mapRef.current;
      if (map?._choroplethPopup) map._choroplethPopup.remove();
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [error, loading, locations]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <span>Heatmap Overview</span>
        <Link className={styles.headerLink} href="/heatmap">
          View full heatmap
        </Link>
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
