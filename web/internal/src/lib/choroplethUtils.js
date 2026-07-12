import mapboxgl from "mapbox-gl";

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────────────────────

export function getColorForIntensity(intensity) {
  if (intensity >= 0.7) return "#ef4444";
  if (intensity >= 0.5) return "#f97316";
  if (intensity >= 0.3) return "#eab308";
  if (intensity >= 0.15) return "#22c55e";
  return "#dbeafe";
}

/**
 * Determine which GeoJSON file to load based on aggregation level
 */
export function getGeoJsonUrl(aggregation) {
  if (aggregation === "region") return "/geojson/ncr-regions.geojson";
  if (aggregation === "council") return "/geojson/ncr-councils.geojson";
  return "/geojson/ncr-cities.geojson";
}

/**
 * Normalise a name string for loose matching
 * (trim, lowercase, collapse whitespace)
 */
function normaliseName(str) {
  return (str || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Join heatmap API density data onto GeoJSON features by name.
 * Returns a new FeatureCollection with density / intensity injected as properties.
 */
export function joinDensityToGeoJSON(geojson, heatmapData) {
  const densityMap = new Map();
  (heatmapData || []).forEach((d) => {
    densityMap.set(normaliseName(d.name), {
      density: d.density,
      intensity: d.intensity,
    });
  });

  const maxDensity = Math.max(
    1,
    ...(heatmapData || []).map((d) => d.density || 0),
  );

  const features = geojson.features.map((feature) => {
    const featureName = normaliseName(feature.properties.name);
    const match = densityMap.get(featureName);
    return {
      ...feature,
      properties: {
        ...feature.properties,
        density: match ? match.density : 0,
        intensity: match ? match.intensity : 0,
        maxDensity,
      },
    };
  });

  return { ...geojson, features };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHOROPLETH LAYER HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_ID = "choropleth-source";
export const FILL_LAYER_ID = "choropleth-fill";
const LINE_LAYER_ID = "choropleth-line";
const HIGHLIGHT_LAYER_ID = "choropleth-highlight";

export function removeChoroplethLayers(map) {
  if (!map || !map.getStyle || !map.isStyleLoaded()) return;
  try {
    [HIGHLIGHT_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch (err) {
    console.warn("[removeChoroplethLayers] skipped:", err.message);
  }
}

/**
 * Add the choropleth fill/line/highlight layers using a local GeoJSON
 * source (with density already merged in via joinDensityToGeoJSON).
 */
export function addChoroplethLayers(map, geojsonWithDensity) {
  removeChoroplethLayers(map);

  map.addSource(SOURCE_ID, {
    type: "geojson",
    data: geojsonWithDensity,
  });

  // Find the water layer to insert the choropleth *below* it.
  // This visually clips the GeoJSON polygons to the landmass by letting
  // the Mapbox water layer render on top of our choropleth fill.
  const layers = map.getStyle().layers;
  let waterLayerId;
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].id === "water" || layers[i].id.includes("water")) {
      waterLayerId = layers[i].id;
      break;
    }
  }

  // Fill layer — color by density intensity
  map.addLayer({
    id: FILL_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    paint: {
      "fill-color": [
        "interpolate",
        ["linear"],
        ["get", "intensity"],
        0,    "rgba(219,234,254,0.55)",
        0.15, "rgba(34,197,94,0.60)",
        0.3,  "rgba(234,179,8,0.68)",
        0.5,  "rgba(249,115,22,0.75)",
        0.7,  "rgba(239,68,68,0.82)",
        1.0,  "rgba(185,28,28,0.90)",
      ],
      "fill-opacity": 1,
    },
  }, waterLayerId); // insert before water layer

  // Outline / border layer
  map.addLayer({
    id: LINE_LAYER_ID,
    type: "line",
    source: SOURCE_ID,
    paint: {
      "line-color": "#ffffff",
      "line-width": 1.5,
      "line-opacity": 0.85,
    },
  }, waterLayerId); // insert before water layer

  // Hover highlight layer — uses fill (not line) so it is clipped by the
  // Mapbox water layer identically to the choropleth fill layer.
  // This ensures the teal outline only appears over the visible land area.
  map.addLayer({
    id: HIGHLIGHT_LAYER_ID,
    type: "fill",
    source: SOURCE_ID,
    filter: ["==", "name", ""],
    paint: {
      "fill-color": "rgba(3, 127, 129, 0.15)",   // subtle teal tint
      "fill-outline-color": "#037F81",             // teal border, 1 px anti-aliased
    },
  }, waterLayerId); // insert before water layer — gets water-clipped like the fill
}

/**
 * Fetch the appropriate GeoJSON boundary file, merge density data, and
 * render fill + line choropleth layers on the map.
 */
export async function loadChoropleth(map, heatmapData, aggregation) {
  try {
    const url = getGeoJsonUrl(aggregation);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load GeoJSON: ${res.status}`);
    const geojson = await res.json();

    if (!map || map._removed || !map.getStyle) return;
    if (!map.isStyleLoaded()) {
      map.once("style.load", () => loadChoropleth(map, heatmapData, aggregation));
      return;
    }

    const enriched = joinDensityToGeoJSON(geojson, heatmapData);
    addChoroplethLayers(map, enriched);

    // Fit map to boundaries
    const bounds = computeBounds(enriched);
    if (bounds) {
      map.fitBounds(bounds, { padding: 40, duration: 600 });
    }
  } catch (err) {
    console.error("[loadChoropleth]", err);
  }
}

/**
 * Compute a [west, south, east, north] bounding box from a FeatureCollection.
 */
export function computeBounds(geojson) {
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;

  function processCoords(coords) {
    if (typeof coords[0] === "number") {
      const [lng, lat] = coords;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    } else {
      coords.forEach(processCoords);
    }
  }

  geojson.features.forEach((f) => {
    if (f.geometry?.coordinates) processCoords(f.geometry.coordinates);
  });

  if (!isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Wire up hover + popup interactions after layers exist.
 * Re-attached every time layers are rebuilt.
 */
export function setupHoverInteraction(map) {
  let hoveredName = null;

  // Clean up any previous listeners to avoid duplicates
  map.off("mousemove", FILL_LAYER_ID);
  map.off("mouseleave", FILL_LAYER_ID);

  map.on("mousemove", FILL_LAYER_ID, (e) => {
    if (!e.features?.length) return;
    map.getCanvas().style.cursor = "pointer";

    const feature = e.features[0];
    const name = feature.properties.name;
    const density = feature.properties.density ?? 0;

    if (name !== hoveredName) {
      hoveredName = name;
      // Highlight border
      if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
        map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", name]);
      }
    }

    // Show / update popup
    if (!map._choroplethPopup) {
      map._choroplethPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: "choropleth-popup",
      });
    }

    map._choroplethPopup
      .setLngLat(e.lngLat)
      .setHTML(
        `<div style="
          font-family: Inter, sans-serif;
          min-width: 140px;
          padding: 4px 2px;
        ">
          <strong style="font-size:0.85rem;color:#111;">${name}</strong>
          <div style="margin-top:4px;font-size:0.78rem;color:#6b7280;">
            ${density} case${density !== 1 ? "s" : ""}
          </div>
        </div>`,
      )
      .addTo(map);
  });

  map.on("mouseleave", FILL_LAYER_ID, () => {
    map.getCanvas().style.cursor = "";
    hoveredName = null;
    if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
      map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", ""]);
    }
    if (map._choroplethPopup) {
      map._choroplethPopup.remove();
      map._choroplethPopup = null;
    }
  });
}

/**
 * NO-OP - Water layer clipping is now handled by inserting the choropleth
 * layer BELOW the mapbox water layer in addChoroplethLayers().
 */
export function removeWaterLayer(map) {
  // Purposefully left empty to keep backwards compatibility with callers.
}
