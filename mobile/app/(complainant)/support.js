import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, Linking,
  StyleSheet, Image, ActivityIndicator, TextInput
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import SideNav from '../../components/SideNav';

const TEAL   = '#037F81';
const ORANGE = '#E96433';
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

const HELPLINES = [
  { name: 'National Emergency Hotline',         number: '911',       desc: '24/7 emergency response' },
  { name: 'DSWD Crisis Intervention Unit',       number: '(02) 8931-8101', desc: 'Social welfare services' },
  { name: 'Philippine National Police Hotline',  number: '117',       desc: 'Crime & safety' },
  { name: 'VAWC Hotline',                        number: '1343',      desc: 'Violence against women & children' },
  { name: 'Hopeline Philippines',                number: '2919',      desc: 'Mental health & crisis support' },
  { name: 'SASHA Helpline',                      number: '0800-1888', desc: 'Our dedicated support line' },
];

const TABS = ['Hospitals', 'Police', 'Helplines'];

function FacilityCard({ name, address, phone, dist }) {
  return (
    <View style={s.card}>
      <View style={s.cardLeft}>
        <Text style={s.cardName}>{name}</Text>
        <Text style={s.cardAddr}>{address}</Text>
        {phone && (
          <Pressable onPress={() => Linking.openURL(`tel:${phone}`)}>
            <Text style={s.cardPhone}>{phone}</Text>
          </Pressable>
        )}
      </View>
      {dist && (
        <View style={s.distBadge}>
          <Text style={s.distText}>{dist}</Text>
        </View>
      )}
    </View>
  );
}

function HelplineCard({ name, number, desc }) {
  return (
    <View style={s.card}>
      <View style={s.helpIcon}>
        <Ionicons name="call" size={20} color={TEAL} />
      </View>
      <View style={s.cardLeft}>
        <Text style={s.cardName}>{name}</Text>
        <Text style={s.cardAddr}>{desc}</Text>
        <Text style={[s.cardPhone, { marginTop: 4 }]}>{number}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable style={s.actionBtnText} onPress={() => Linking.openURL(`sms:${number}`)}>
          <Ionicons name="chatbubble-ellipses" size={14} color={TEAL} />
          <Text style={s.actionBtnLabel}>Text</Text>
        </Pressable>
        <Pressable style={s.actionBtnCall} onPress={() => Linking.openURL(`tel:${number}`)}>
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={s.actionBtnLabelCall}>Call</Text>
        </Pressable>
      </View>
    </View>
  );
}

const mapHtml = `
<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"></script>
<style>body{margin:0;padding:0;}#map{position:absolute;top:0;bottom:0;width:100%;}.mapboxgl-ctrl-top-right{display:none;}</style>
</head><body><div id="map"></div><script>
let map;
let markers = [];
function renderMap(token, center, facilities, facilityColor) {
  if (!map) {
    mapboxgl.accessToken = token;
    map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v11',
      center: center,
      zoom: 12,
      interactive: false
    });
    map.on('load', () => {
      drawMarkers(center, facilities, facilityColor);
    });
  } else {
    drawMarkers(center, facilities, facilityColor);
  }
}
function drawMarkers(center, facilities, facilityColor) {
  markers.forEach(m => m.remove());
  markers = [];
  const bounds = new mapboxgl.LngLatBounds();
  bounds.extend(center);
  
  const userMarker = new mapboxgl.Marker({ color: "#037F81" })
    .setLngLat(center)
    .addTo(map);
  markers.push(userMarker);
  
  facilities.forEach(f => {
    bounds.extend(f.center);
    const m = new mapboxgl.Marker({ color: facilityColor })
      .setLngLat(f.center)
      .addTo(map);
    markers.push(m);
  });
  
  if (facilities.length > 0) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 14, duration: 1000 });
  } else {
    map.setCenter(center);
    map.setZoom(12);
  }
}
document.addEventListener('message', function(e) {
  try {
    const d = JSON.parse(e.data);
    if (d.type === 'RENDER') renderMap(d.token, d.center, d.facilities, d.facilityColor);
  } catch(err){}
});
window.addEventListener('message', function(e) {
  try {
    const d = JSON.parse(e.data);
    if (d.type === 'RENDER') renderMap(d.token, d.center, d.facilities, d.facilityColor);
  } catch(err){}
});
</script></body></html>
`;

function distanceKm(from, to) {
  if (!from || !to) return null;
  const [lng1, lat1] = from.map(Number);
  const [lng2, lat2] = to.map(Number);
  const r = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}
function buildBbox(center, radius = 0.05) {
  const [lng, lat] = center;
  return [lng - radius, lat - radius, lng + radius, lat + radius].join(",");
}

export default function SupportScreen() {
  const router  = useRouter();
  const params = useLocalSearchParams();
  const [navOpen, setNavOpen] = useState(false);
  const [tab, setTab] = useState(params.tab || 'Hospitals');
  
  const [location, setLocation] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  const webRef = useRef(null);
  const gpsFetchedRef = useRef(false);

  useEffect(() => {
    if (params.tab && params.tab !== tab) {
      setTab(params.tab);
    }
  }, [params.tab]);

  const fetchFacilities = async (center, currentTab) => {
    setLoading(true);
    setErrorMsg('');
    setFacilities([]);
    
    if (!MAPBOX_TOKEN) {
      setErrorMsg('Mapbox token is missing.');
      setLoading(false);
      return;
    }

    try {
      const categories = currentTab === 'Hospitals' 
        ? ["hospital", "clinic", "emergency_room_and_urgent_care_facility"] 
        : ["police_station", "police"];
      
      const bbox = buildBbox(center);
      const prox = center.join(",");
      
      const promises = categories.map(slug => 
        fetch(`https://api.mapbox.com/search/searchbox/v1/category/${slug}?access_token=${MAPBOX_TOKEN}&proximity=${prox}&bbox=${bbox}&limit=10&country=PH&language=en`)
          .then(r => r.ok ? r.json() : { features: [] })
          .catch(() => ({ features: [] }))
      );
      
      const keyword = currentTab === 'Hospitals' ? 'hospital' : 'PNP';
      const txtPromise = fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${keyword}.json?access_token=${MAPBOX_TOKEN}&proximity=${prox}&bbox=${bbox}&types=poi&limit=10&country=PH`)
        .then(r => r.ok ? r.json() : { features: [] })
        .catch(() => ({ features: [] }));

      const results = await Promise.all([...promises, txtPromise]);

      const seen = new Set();
      const fetched = results
        .flatMap(d => d.features || [])
        .filter(f => f.geometry?.coordinates?.length === 2 || f.center?.length === 2)
        .map(f => {
          const coords = f.geometry?.coordinates || f.center;
          return {
            id: f.id || f.properties?.mapbox_id || `${f.properties?.name || f.text}-${coords.join(",")}`,
            name: f.properties?.name || f.text || "Unknown",
            address: f.properties?.full_address || f.properties?.place_formatted || f.properties?.address || f.place_name || "Address unavailable",
            center: coords,
            distance: distanceKm(center, coords)
          };
        })
        .filter(f => {
          const key = `${f.name}-${f.center.join(",")}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => (a.distance || 999) - (b.distance || 999))
        .slice(0, 12);
        
      setFacilities(fetched);

      if (webRef.current) {
        webRef.current.postMessage(JSON.stringify({
          type: 'RENDER',
          token: MAPBOX_TOKEN,
          center: center,
          facilities: fetched,
          facilityColor: "#E8663A"
        }));
      }
    } catch (err) {
      setErrorMsg('Failed to find nearby facilities. ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'Helplines') return;
    
    if (!location && !gpsFetchedRef.current) {
      gpsFetchedRef.current = true;
      (async () => {
        setIsLocating(true);
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied. Please enter a location manually.');
            setIsLocating(false);
            return;
          }
          let loc = await Location.getCurrentPositionAsync({});
          const center = [loc.coords.longitude, loc.coords.latitude];
          setLocation(center);
          fetchFacilities(center, tab);
        } catch (err) {
          setErrorMsg('Failed to get current location. Please enter a location manually.');
        } finally {
          setIsLocating(false);
        }
      })();
    } else if (location) {
      fetchFacilities(location, tab);
    }
  }, [tab]);

  const handleManualSearch = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !MAPBOX_TOKEN) return;
    
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,neighborhood,address,poi&limit=1&country=PH`);
      const data = await res.json();
      
      if (data.features && data.features.length > 0) {
        const center = data.features[0].center;
        setLocation(center);
        fetchFacilities(center, tab);
      } else {
        setErrorMsg('Location not found.');
        setFacilities([]);
      }
    } catch (err) {
      setErrorMsg('Error searching for location.');
      setLoading(false);
    }
  };

  const updateMap = () => {
    if (webRef.current && location && MAPBOX_TOKEN) {
      webRef.current.postMessage(JSON.stringify({
        type: 'RENDER',
        token: MAPBOX_TOKEN,
        center: location,
        facilities: facilities,
        facilityColor: "#E8663A"
      }));
    }
  };

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />

      <View style={s.topBar}>
        <Pressable onPress={() => setNavOpen(true)} style={s.burgerBtn}>
          <Ionicons name="menu" size={26} color="#fff" />
        </Pressable>
        <Text style={s.topTitle}>Support & Resources</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={s.tabBar}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{t}</Text>
          </Pressable>
        ))}
      </View>

      {tab !== 'Helplines' && (
        <View style={s.searchContainer}>
          <View style={s.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#6b7280" style={{ marginRight: 8 }} />
            <TextInput
              style={s.searchInput}
              placeholder="Enter Address or Landmark"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleManualSearch}
              returnKeyType="search"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <Pressable style={s.searchBtn} onPress={handleManualSearch}>
            <Text style={s.searchBtnText}>Search</Text>
          </Pressable>
        </View>
      )}

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {tab !== 'Helplines' && (
          <View style={s.mapWrapper}>
            <WebView
              ref={webRef}
              source={{ html: mapHtml }}
              style={s.map}
              onLoadEnd={updateMap}
              originWhitelist={['*']}
              javaScriptEnabled
              scrollEnabled={false}
              bounces={false}
              pointerEvents="none"
            />
          </View>
        )}

        {tab === 'Helplines' && HELPLINES.map((h) => (
          <HelplineCard key={h.name} {...h} />
        ))}
        
        {tab !== 'Helplines' && (loading || isLocating) && (
          <ActivityIndicator size="large" color={TEAL} style={{ marginVertical: 20 }} />
        )}
        
        {tab !== 'Helplines' && errorMsg ? (
          <Text style={s.errorText}>{errorMsg}</Text>
        ) : null}

        {tab !== 'Helplines' && !loading && !isLocating && facilities.length === 0 && !errorMsg && location && (
          <Text style={s.emptyText}>No nearby {tab === 'Hospitals' ? 'hospitals' : 'police stations'} found.</Text>
        )}

        {tab !== 'Helplines' && facilities.map((f) => (
          <FacilityCard key={f.id} name={f.name} address={f.address} dist={f.distance ? `${f.distance.toFixed(1)} km` : ''} />
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },
  topBar: {
    backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16,
    paddingTop: 52, paddingBottom: 16,
  },
  burgerBtn: { padding: 4 },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16,
    paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#f3f4f6' },
  tabBtnActive: { backgroundColor: TEAL },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  tabLabelActive: { color: '#fff' },
  
  searchContainer: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8
  },
  searchInputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: '#e5e7eb'
  },
  searchInput: {
    flex: 1, height: 40, fontSize: 14, color: '#1a1a1a'
  },
  searchBtn: {
    backgroundColor: TEAL, borderRadius: 10, paddingHorizontal: 16,
    justifyContent: 'center', alignItems: 'center'
  },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  helpIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#e6f7f7',
    alignItems: 'center', justifyContent: 'center',
  },
  cardLeft: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  cardAddr: { fontSize: 12, color: '#6b7280' },
  cardPhone: { fontSize: 13, color: TEAL, fontWeight: '600', marginTop: 2 },
  distBadge: { backgroundColor: '#e6f7f7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  distText: { fontSize: 12, color: TEAL, fontWeight: '700' },
  actionBtnText: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7f7',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4
  },
  actionBtnCall: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: TEAL,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4
  },
  actionBtnLabel: { color: TEAL, fontSize: 12, fontWeight: '700' },
  actionBtnLabelCall: { color: '#fff', fontSize: 12, fontWeight: '700' },
  mapWrapper: {
    width: '100%', height: 200, borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8
  },
  map: { width: '100%', height: '100%' },
  errorText: { color: '#e84118', fontSize: 13, textAlign: 'center', marginVertical: 10 },
  emptyText: { color: '#6b7280', fontSize: 13, textAlign: 'center', marginVertical: 10 }
});
