import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import SideNav from '../../components/SideNav';
import { API_URL, MAPBOX_TOKEN } from '../../lib/config';

// Import geojson data as JS objects
import ncrCities from '../../assets/geojson/ncr-cities';

const TEAL = '#037F81';

// The HTML template containing Mapbox GL JS and the exact choropleth rendering logic
const mapboxHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet">
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"><\/script>
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .mapboxgl-popup-content {
      font-family: 'Inter', sans-serif;
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  let map;
  const FILL_LAYER_ID = "choropleth-fill";
  const LINE_LAYER_ID = "choropleth-line";
  const HIGHLIGHT_LAYER_ID = "choropleth-highlight";
  const SOURCE_ID = "choropleth-source";

  function normaliseName(str) {
    return (str || "").trim().toLowerCase().replace(/\\s+/g, " ");
  }

  function joinDensityToGeoJSON(geojson, heatmapData) {
    const densityMap = new Map();
    (heatmapData || []).forEach((d) => {
      densityMap.set(normaliseName(d.name), {
        density: d.density,
        intensity: d.intensity,
      });
    });

    const maxDensity = Math.max(1, ...(heatmapData || []).map((d) => d.density || 0));

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

  function computeBounds(geojson) {
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
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
    return [[minLng, minLat], [maxLng, maxLat]];
  }

  function setupInteraction() {
    let clickedName = null;
    let popup = null;

    map.on("click", FILL_LAYER_ID, (e) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const name = feature.properties.name;
      const density = feature.properties.density ?? 0;

      if (name !== clickedName) {
        clickedName = name;
        if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
          map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", name]);
        }
      }

      if (!popup) {
        popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, className: "choropleth-popup" });
        popup.on('close', () => {
          clickedName = null;
          if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
            map.setFilter(HIGHLIGHT_LAYER_ID, ["==", "name", ""]);
          }
        });
      }

      popup.setLngLat(e.lngLat)
        .setHTML('<div style="min-width: 140px;">' +
                 '<strong style="font-size:0.85rem;color:#111;">' + name + '</strong>' +
                 '<div style="margin-top:4px;font-size:0.78rem;color:#6b7280;">' + density + ' case(s)</div>' +
                 '</div>')
        .addTo(map);
    });
  }

  function renderChoropleth(heatmapData, geojsonRaw) {
    if (!map.isStyleLoaded()) {
      map.once('style.load', () => renderChoropleth(heatmapData, geojsonRaw));
      return;
    }

    const geojson = joinDensityToGeoJSON(geojsonRaw, heatmapData);

    try {
      [HIGHLIGHT_LAYER_ID, LINE_LAYER_ID, FILL_LAYER_ID].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
    } catch(e) {}

    map.addSource(SOURCE_ID, { type: "geojson", data: geojson });

    const layers = map.getStyle().layers;
    let waterLayerId;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id.includes("water")) {
        waterLayerId = layers[i].id;
        break;
      }
    }

    map.addLayer({
      id: FILL_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      paint: {
        "fill-color": [
          "interpolate", ["linear"], ["get", "intensity"],
          0,    "rgba(219,234,254,0.55)",
          0.15, "rgba(34,197,94,0.60)",
          0.3,  "rgba(234,179,8,0.68)",
          0.5,  "rgba(249,115,22,0.75)",
          0.7,  "rgba(239,68,68,0.82)",
          1.0,  "rgba(185,28,28,0.90)"
        ],
        "fill-opacity": 1,
      },
    }, waterLayerId);

    map.addLayer({
      id: LINE_LAYER_ID,
      type: "line",
      source: SOURCE_ID,
      paint: {
        "line-color": "#ffffff",
        "line-width": 1.5,
        "line-opacity": 0.85,
      },
    }, waterLayerId);

    map.addLayer({
      id: HIGHLIGHT_LAYER_ID,
      type: "fill",
      source: SOURCE_ID,
      filter: ["==", "name", ""],
      paint: {
        "fill-color": "rgba(3, 127, 129, 0.15)",
        "fill-outline-color": "#037F81",
      },
    }, waterLayerId);

    setupInteraction();

    const bounds = computeBounds(geojson);
    if (bounds) {
      map.fitBounds(bounds, { padding: 40, duration: 600 });
    }
  }

  // Handle messages from React Native
  document.addEventListener('message', function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT') {
        mapboxgl.accessToken = data.token;
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/light-v11',
          center: [121.0376, 14.5995],
          zoom: 10.5,
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        // Signal RN once style is fully loaded
        map.on('load', function() {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MAP_READY');
        });
      } else if (data.type === 'RENDER') {
        renderChoropleth(data.heatmapData, data.geojson);
      }
    } catch(err) { console.error(err); }
  });
  
  // For iOS window.postMessage compatibility
  window.addEventListener('message', function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'INIT') {
        mapboxgl.accessToken = data.token;
        map = new mapboxgl.Map({
          container: 'map',
          style: 'mapbox://styles/mapbox/light-v11',
          center: [121.0376, 14.5995],
          zoom: 10.5,
        });
        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        // Signal RN once style is fully loaded
        map.on('load', function() {
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage('MAP_READY');
          else window.parent.postMessage('MAP_READY', '*');
        });
      } else if (data.type === 'RENDER') {
        renderChoropleth(data.heatmapData, data.geojson);
      }
    } catch(err) {}
  });
<\/script>
</body>
</html>
`;


function FilterModal({ visible, onClose, meta, filters, setFilters }) {
  const { regions = [], cities = [], councils = [], statuses = [] } = meta;

  const citiesInRegion = filters.region
    ? regions.find((r) => r.key === filters.region)?.cities || []
    : cities;

  const renderOptionList = (title, items, valueKey, labelKey, filterKey) => (
    <View style={s.filterGroup}>
      <Text style={s.filterLabel}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        <Pressable
          style={[s.filterChip, !filters[filterKey] && s.filterChipActive]}
          onPress={() => setFilters(prev => ({ ...prev, [filterKey]: '', ...(filterKey === 'region' ? {city: ''} : {}) }))}
        >
          <Text style={[s.filterChipText, !filters[filterKey] && s.filterChipTextActive]}>All</Text>
        </Pressable>
        {items.map((item, idx) => {
          const val = typeof item === 'object' ? item[valueKey] : item;
          const lbl = typeof item === 'object' ? item[labelKey] : item;
          const isActive = filters[filterKey] === val;
          return (
            <Pressable
              key={idx}
              style={[s.filterChip, isActive && s.filterChipActive]}
              onPress={() => setFilters(prev => ({ ...prev, [filterKey]: val, ...(filterKey === 'region' ? {city: ''} : {}) }))}
            >
              <Text style={[s.filterChipText, isActive && s.filterChipTextActive]}>{lbl}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Filters</Text>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={24} color="#1a1a1a" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderOptionList('Region', regions, 'key', 'label', 'region')}
            {renderOptionList('City', citiesInRegion, null, null, 'city')}
            {renderOptionList('Council', councils, null, null, 'council')}
            {renderOptionList('Status', statuses, null, null, 'status')}
            
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function HeatmapScreen() {
  const [navOpen, setNavOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ regions: [], cities: [], councils: [], statuses: [] });
  const [totalReports, setTotalReports] = useState(0);

  const [filters, setFilters] = useState({
    region: '', city: '', council: '', status: ''
  });

  const webViewRef = useRef(null);
  const heatmapDataRef = useRef([]); // always hold latest data for MAP_READY callback
  const hasMapboxToken = Boolean(MAPBOX_TOKEN);

  useEffect(() => {
    async function fetchMeta() {
      try {
        const [geoRes, statusRes] = await Promise.all([
          fetch(`${API_URL}/api/case_reports/heatmap/meta`),
          fetch(`${API_URL}/api/case_status`),
        ]);
        const geo = geoRes.ok ? await geoRes.json() : {};
        const statusRows = statusRes.ok ? await statusRes.json() : [];
        const statuses = Array.isArray(statusRows)
          ? statusRows.map((r) => r.status_name).filter(Boolean)
          : [];
        setMeta({
          regions: geo.regions || [],
          cities: geo.cities || [],
          councils: geo.councils || [],
          statuses,
        });
      } catch (err) {
        console.error("[fetchMeta]", err.message);
      }
    }
    fetchMeta();
  }, []);

  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        queryParams.append("aggregation", "city");
        if (filters.city) queryParams.append("city", filters.city);
        if (filters.region) queryParams.append("region", filters.region);
        if (filters.council) queryParams.append("council", filters.council);
        if (filters.status) queryParams.append("status", filters.status);

        const res = await fetch(`${API_URL}/api/case_reports/heatmap/data?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch data");
        const response = await res.json();
        const data = response.data || [];
        
        heatmapDataRef.current = data;
        setHeatmapData(data);
        setTotalReports(response.totalReports || 0);

        // Push data into map immediately (works if map is already ready)
        if (webViewRef.current) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'RENDER',
            heatmapData: data,
            geojson: ncrCities,
          }));
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmapData();
  }, [filters]);

  // Called by WebView once the Mapbox style is fully loaded
  const onMapReady = () => {
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'RENDER',
        heatmapData: heatmapDataRef.current,
        geojson: ncrCities,
      }));
    }
  };

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable onPress={() => setNavOpen(true)} style={s.burgerBtn}>
          <Ionicons name="menu" size={26} color="#fff" />
        </Pressable>
        <Text style={s.topTitle}>Heatmap</Text>
        <Pressable onPress={() => setFilterOpen(true)} style={s.filterIconBtn}>
          <Ionicons name="filter" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={s.mapContainer}>
        {hasMapboxToken ? (
          <WebView
            ref={webViewRef}
            source={{ html: mapboxHtml }}
            style={s.map}
            onLoadEnd={() => {
              if (webViewRef.current) {
                webViewRef.current.postMessage(JSON.stringify({
                  type: 'INIT',
                  token: MAPBOX_TOKEN,
                }));
              }
            }}
            onMessage={(e) => {
              if (e.nativeEvent.data === 'MAP_READY') onMapReady();
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            scrollEnabled={false}
            bounces={false}
          />
        ) : (
          <View style={[s.map, s.mapMissingConfig]}>
            <Ionicons name="map-outline" size={42} color={TEAL} />
            <Text style={s.mapMissingTitle}>Map is not configured</Text>
            <Text style={s.mapMissingText}>
              Rebuild the APK with EXPO_PUBLIC_MAPBOX_TOKEN set in the build environment.
            </Text>
          </View>
        )}

        {loading && hasMapboxToken && (
          <View style={[s.loadingContainer, StyleSheet.absoluteFill]}>
            <ActivityIndicator size="large" color={TEAL} />
            <Text style={s.loadingText}>Updating heatmap...</Text>
          </View>
        )}

        <View style={s.reportCountBadge}>
          <Text style={s.reportCountText}>Reports shown: {totalReports}</Text>
        </View>

        <View style={s.legend}>
          <Text style={s.legendTitle}>Density</Text>
          {[
            { color: '#ef4444', label: 'High (≥70%)' },
            { color: '#f97316', label: 'Medium-High' },
            { color: '#eab308', label: 'Medium' },
            { color: '#22c55e', label: 'Low' },
          ].map(({ color, label }) => (
            <View key={label} style={s.legendRow}>
              <View style={[s.legendColor, { backgroundColor: color }]} />
              <Text style={s.legendLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      <FilterModal
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        meta={meta}
        filters={filters}
        setFilters={setFilters}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },
  topBar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 16,
  },
  burgerBtn: { padding: 4 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  filterIconBtn: { padding: 4 },
  mapContainer: { flex: 1, position: 'relative' },
  map: { width: '100%', height: '100%', backgroundColor: '#f5f7f8' },
  mapMissingConfig: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mapMissingTitle: {
    marginTop: 14,
    color: TEAL,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapMissingText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  
  reportCountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  reportCountText: { fontWeight: '600', color: TEAL },

  legend: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  legendTitle: { fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendColor: { width: 14, height: 14, borderRadius: 4, marginRight: 8 },
  legendLabel: { fontSize: 12, color: '#4b5563' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { padding: 4 },
  
  filterGroup: { marginBottom: 20 },
  filterLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  filterScroll: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#e6f7f7', borderColor: TEAL },
  filterChipText: { color: '#4b5563', fontWeight: '500' },
  filterChipTextActive: { color: TEAL, fontWeight: '700' },
});
