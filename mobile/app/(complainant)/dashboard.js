import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  ImageBackground,
  ActivityIndicator,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import ncrCities from '../../assets/geojson/ncr-cities';

// ── Top Navbar ────────────────────────────────────────────────────────────────
function Navbar({ onBurger, onNotifications, notifCount, user }) {

  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={s.burgerBtn}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <NavSearchButton />
        <Pressable onPress={onNotifications} style={s.notifContainer}>
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          {notifCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{notifCount > 9 ? '9+' : notifCount}</Text>
            </View>
          )}
        </Pressable>
        <HeaderAvatar user={user} />
      </View>
    </View>
  );
}

// ── Hero Banner ───────────────────────────────────────────────────────────────
function HeroBanner({ firstName, lastName, totalNotifications }) {
  return (
    <View style={s.heroBannerWrap}>
      <ImageBackground
        source={require('../../assets/mob-hero-1.png')}
        style={s.heroCard}
        imageStyle={{ borderRadius: 16 }}
      >
        <View style={s.heroOverlay}>
          <Text style={s.heroTitle}>Welcome, {firstName} {lastName}!</Text>
          <View style={s.statCard}>
            <View style={s.statDot} />
            <Text style={s.statNum}>{totalNotifications}</Text>
            <Text style={s.statLabel}>New{'\n'}Notifications</Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

// ── Section Heading ───────────────────────────────────────────────────────────
function SectionHeading({ title }) {
  return (
    <View style={s.sectionHeading}>
      <View style={s.headingLine} />
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.headingLineRight} />
    </View>
  );
}

// ── Action Card ───────────────────────────────────────────────────────────────
function ActionCard({ iconSource, ionicon, title, description, onPress }) {
  return (
    <View style={s.actionCard}>
      <View style={s.actionIconWrap}>
        {ionicon ? (
          <Ionicons name={ionicon} size={24} color="#037F81" />
        ) : (
          <Image source={iconSource} style={s.actionIconImg} resizeMode="contain" />
        )}
      </View>
      <Text style={s.actionTitle}>{title}</Text>
      <Text style={s.actionDesc}>{description}</Text>
      <Pressable style={s.viewBtn} onPress={onPress}>
        <Text style={s.viewBtnText}>View →</Text>
      </Pressable>
    </View>
  );
}

// ── Status Stepper ────────────────────────────────────────────────────────────
function StatusStepper({ steps, current }) {
  return (
    <View style={s.stepper}>
      {steps.map((label, i) => (
        <View key={label} style={s.stepItem}>
          {i > 0 && (
            <View style={[s.stepLine, i <= current && s.stepLineDone]} />
          )}
          <View style={[
            s.stepDot,
            i < current && s.stepDotDone,
            i === current && s.stepDotActive,
          ]} />
          <Text style={[s.stepLabel, i === current && s.stepLabelActive]}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ── Status Card ───────────────────────────────────────────────────────────────
function StatusCard({ title, email, contactNumber, dateApplied, steps, currentStep, onView }) {
  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>{title}</Text>
        <Pressable onPress={onView}>
          <Text style={s.headerViewBtn}>View →</Text>
        </Pressable>
      </View>
      <View style={s.cardBody}>
        <Text style={s.statusMeta}>Email: {email}</Text>
        <Text style={s.statusMeta}>Contact Number: {contactNumber}</Text>
        <Text style={s.statusMeta}>Date Applied: {dateApplied}</Text>
        <StatusStepper steps={steps} current={currentStep} />
      </View>
    </View>
  );
}

// ── Notifications Card ────────────────────────────────────────────────────────
function NotificationsCard({ notifications, onView }) {
  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>Important Notifications</Text>
      </View>
      <View style={s.cardBody}>
        {notifications.map((n) => (
          <View key={n.id} style={s.notifItem}>
            <Text style={s.notifText} numberOfLines={1}>{n.text}</Text>
          </View>
        ))}
        <Pressable style={s.viewBtn} onPress={onView}>
          <Text style={s.viewBtnText}>View →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Heatmap Preview ───────────────────────────────────────────────────────────
const MAPBOX_TOKEN_DASH = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
const API_URL_DASH = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const miniMapHtml = `
<!DOCTYPE html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no">
<link href="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.6.0/mapbox-gl.js"><\/script>
<style>body{margin:0;padding:0;}#map{position:absolute;top:0;bottom:0;width:100%;}.mapboxgl-ctrl-top-right{display:none;}</style>
</head><body><div id="map"></div><script>
let map;
function normaliseName(s){return(s||'').trim().toLowerCase().replace(/\\s+/g,' ');}
function joinDensity(geojson,data){
  const m=new Map();
  (data||[]).forEach(d=>m.set(normaliseName(d.name),{density:d.density,intensity:d.intensity}));
  return{...geojson,features:geojson.features.map(f=>({...f,properties:{...f.properties,...(m.get(normaliseName(f.properties.name))||{density:0,intensity:0})}}))}
}
function render(heatmapData,geo){
  if(!map||!map.isStyleLoaded()){if(map)map.once('style.load',()=>render(heatmapData,geo));return;}
  const src='cs';const fl='cf';const ll='cl';
  try{if(map.getLayer(ll))map.removeLayer(ll);if(map.getLayer(fl))map.removeLayer(fl);if(map.getSource(src))map.removeSource(src);}catch(e){}
  const gj=joinDensity(geo,heatmapData);
  map.addSource(src,{type:'geojson',data:gj});
  const layers=map.getStyle().layers;let water;for(let i=0;i<layers.length;i++){if(layers[i].id.includes('water')){water=layers[i].id;break;}}
  map.addLayer({id:fl,type:'fill',source:src,paint:{'fill-color':['interpolate',['linear'],['get','intensity'],0,'rgba(219,234,254,0.55)',0.15,'rgba(34,197,94,0.60)',0.3,'rgba(234,179,8,0.68)',0.5,'rgba(249,115,22,0.75)',0.7,'rgba(239,68,68,0.82)',1,'rgba(185,28,28,0.90)'],'fill-opacity':1}},water);
  map.addLayer({id:ll,type:'line',source:src,paint:{'line-color':'#ffffff','line-width':1,'line-opacity':0.7}},water);
}
document.addEventListener('message',function(e){try{const d=JSON.parse(e.data);if(d.type==='INIT'){mapboxgl.accessToken=d.token;map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/light-v11',center:[121.0376,14.5995],zoom:9.5,interactive:false});map.on('load',function(){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage('MAP_READY');});}else if(d.type==='RENDER'){render(d.heatmapData,d.geojson);}}catch(err){}});
window.addEventListener('message',function(e){try{const d=JSON.parse(e.data);if(d.type==='INIT'){mapboxgl.accessToken=d.token;map=new mapboxgl.Map({container:'map',style:'mapbox://styles/mapbox/light-v11',center:[121.0376,14.5995],zoom:9.5,interactive:false});map.on('load',function(){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage('MAP_READY');});}else if(d.type==='RENDER'){render(d.heatmapData,d.geojson);}}catch(err){}});
<\/script></body></html>
`;

function HeatmapPreview() {
  const router = useRouter();
  const webRef = useRef(null);
  const dataRef = useRef([]);

  useEffect(() => {
    fetch(`${API_URL_DASH}/api/case_reports/heatmap/data?aggregation=city`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data) {
          dataRef.current = res.data;
          if (webRef.current) {
            webRef.current.postMessage(JSON.stringify({ type: 'RENDER', heatmapData: res.data, geojson: ncrCities }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const onMapReady = () => {
    if (webRef.current) {
      webRef.current.postMessage(JSON.stringify({ type: 'RENDER', heatmapData: dataRef.current, geojson: ncrCities }));
    }
  };

  return (
    <View style={s.heatmapCard}>
      <View style={s.heatmapCardHeader}>
        <View style={s.heatmapTitleRow}>
          <Ionicons name="map" size={16} color="#037F81" style={{ marginRight: 6 }} />
          <Text style={s.heatmapTitle}>Incident Heatmap</Text>
        </View>
        <Pressable onPress={() => router.push('/(complainant)/heatmap')} style={s.heatmapViewBtn}>
          <Text style={s.heatmapViewBtnText}>View Full Map</Text>
          <Ionicons name="arrow-forward" size={13} color="#037F81" />
        </Pressable>
      </View>
      <View style={s.heatmapMapWrap}>
        <WebView
          ref={webRef}
          source={{ html: miniMapHtml }}
          style={s.heatmapMap}
          onLoadEnd={() => {
            if (webRef.current && MAPBOX_TOKEN_DASH) {
              webRef.current.postMessage(JSON.stringify({ type: 'INIT', token: MAPBOX_TOKEN_DASH }));
            }
          }}
          onMessage={e => { if (e.nativeEvent.data === 'MAP_READY') onMapReady(); }}
          originWhitelist={['*']}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          pointerEvents="none"
        />
        <View style={s.heatmapLegend}>
          {[{c:'#ef4444',l:'High'},{c:'#f97316',l:'Med-High'},{c:'#eab308',l:'Med'},{c:'#22c55e',l:'Low'}].map(({c,l})=>(
            <View key={l} style={s.heatmapLegendRow}>
              <View style={[s.heatmapLegendDot,{backgroundColor:c}]} />
              <Text style={s.heatmapLegendText}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Events Card ───────────────────────────────────────────────────────────────
function EventsCard({ events }) {
  const [selectedDate, setSelectedDate] = useState(null);

  const markedDates = useMemo(() => {
    const marks = {};
    events.forEach(e => {
      if (e.date) {
        // e.date might be '2026-03-01T00:00:00.000Z' or '2026-03-01'
        const dateString = String(e.date).split('T')[0];
        marks[dateString] = { marked: true, dotColor: ORANGE };
      }
    });
    if (selectedDate) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: TEAL };
    }
    return marks;
  }, [events, selectedDate]);

  const displayedEvents = useMemo(() => {
    if (!selectedDate) return events;
    return events.filter(e => {
      if (!e.date) return false;
      const d = String(e.date).split('T')[0];
      return d === selectedDate;
    });
  }, [events, selectedDate]);

  return (
    <View style={s.statusCard}>
      <View style={s.cardHeader}>
        <Text style={s.cardHeaderText}>Your Events</Text>
      </View>
      <View style={s.cardBody}>
        <Calendar
          onDayPress={day => {
            if (selectedDate === day.dateString) {
              setSelectedDate(null);
            } else {
              setSelectedDate(day.dateString);
            }
          }}
          markedDates={markedDates}
          theme={{
            selectedDayBackgroundColor: TEAL,
            todayTextColor: ORANGE,
            arrowColor: TEAL,
            dotColor: ORANGE,
          }}
          style={{ marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: BORDER }}
        />
        <Text style={s.upcomingTitle}>{selectedDate ? 'Events on Selected Date' : 'Upcoming Events'}</Text>
        {displayedEvents.length === 0 ? (
          <Text style={s.statusMeta}>No upcoming events available.</Text>
        ) : (
          displayedEvents.map((e) => (
            <View key={e.id} style={s.eventItem}>
              <View style={s.eventThumb}>
                {e.image ? (
                  <Image source={{ uri: e.image }} style={s.eventImageThumb} />
                ) : (
                  <Text style={s.eventThumbEmoji}>📅</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={s.eventTitle}>{e.title}</Text>
                <Text style={s.eventDate}>{e.date ? new Date(e.date).toLocaleDateString() : 'TBA'}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000";

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ComplainantDashboard() {
  const [navOpen, setNavOpen] = useState(false);
  const router = useRouter();

  const [user, setUser] = useState({ firstName: 'User', lastName: 'Name', email: '' });
  const [reports, setReports] = useState([]);
  const [dashEvents, setDashEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Get user and token from AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('user_token');

      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser({
          firstName: parsedUser.first_name || 'User',
          lastName: parsedUser.last_name || 'Name',
          email: parsedUser.email || '',
        });
      }

      if (!token) {
        setLoading(false);
        return;
      }

      // 2. Fetch reports
      const reportsRes = await fetch(`${API_URL}/api/case_reports/my-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const reportsData = await reportsRes.json();

      // 3. Fetch public events
      const eventsRes = await fetch(`${API_URL}/api/projects?visibility=public&approval_status=approved`);
      let fetchedEvents = [];
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const raw = Array.isArray(eventsData) ? eventsData : eventsData?.data || [];
        fetchedEvents = raw.slice(0, 3).map(p => ({
          id: p.id ?? p.project_id,
          title: p.title || p.event_name || 'Untitled Event',
          date: p.start_date || p.dateStart || '',
          image: p.image || null,
        }));
      }

      if (reportsRes.ok && reportsData.data) {
        setReports(reportsData.data);
      }
      setDashEvents(fetchedEvents);

    } catch (err) {
      console.error('[fetchData]', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // Dynamic notifications based on real data
  const getNotifications = () => {
    const list = [];
    
    if (reports.length === 0) {
      list.push({ id: 'welcome', text: 'Welcome to SAVIRA! Submit a report to get started.' });
    }

    reports.forEach((rep, idx) => {
      const displayId = rep.case_report_id ? String(rep.case_report_id).slice(0, 8).toUpperCase() : `REP-${idx}`;
      const statusText = rep.case_status_id === 3 ? 'Resolved' : rep.case_status_id === 2 ? 'Under Review' : 'Submitted';
      list.push({
        id: `rep-${rep.case_report_id || idx}`,
        text: `Report #${displayId} status update: Case is currently "${statusText}".`
      });
    });

    return list.slice(0, 5); // Limit to top 5 notifications
  };

  const notifications = getNotifications();

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar 
        onBurger={() => setNavOpen(true)} 
        onNotifications={() => router.push('/(complainant)/notifications')}
        notifCount={notifications.length}
        user={user}
      />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        <HeroBanner
          firstName={user.firstName}
          lastName={user.lastName}
          totalNotifications={notifications.length}
        />

        <View style={s.content}>

          {loading && (
            <ActivityIndicator size="large" color="#037F81" style={{ marginVertical: 20 }} />
          )}

          <SectionHeading title="What would you like to do?" />

          <ActionCard
            iconSource={require('../../assets/FileAReportIcon.png')}
            title="Submit a Report"
            description="Report safely and securely."
            onPress={() => router.push('/(complainant)/reports')}
          />
          <SectionHeading title="Overview" />

          <NotificationsCard
            notifications={notifications}
            onView={() => {}}
          />

          {/* Render Case Reports Status */}
          {reports.length > 0 ? (
            reports.slice(0, 1).map((rep, idx) => {
              const rawReportId = rep.case_report_id || rep.id;
              const createdAt = rep.created_at || rep.incident_date;
              const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
              const displayId = rawReportId ? `${year}-${String(rawReportId).padStart(3, '0')}` : `REP-${idx + 1}`;
              // map case_status_id (1 -> 0, 2 -> 1, 3 -> 2)
              const currentStep = rep.case_status_id ? rep.case_status_id - 1 : 0;
              return (
                <StatusCard
                  key={rep.case_report_id}
                  title="Latest Report"
                  email={user.email || 'N/A'}
                  contactNumber="Provided in Report"
                  dateApplied={rep.incident_date ? new Date(rep.incident_date).toLocaleDateString() : 'N/A'}
                  steps={['Submitted', 'Assessed', 'Resolved']}
                  currentStep={currentStep >= 0 && currentStep <= 2 ? currentStep : 0}
                  onView={() => router.push({
                    pathname: '/(complainant)/report-detail',
                    params: { caseId: rawReportId, displayId },
                  })}
                />
              );
            })
          ) : (
            <View style={s.emptyCard}>
              <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
              <Text style={s.emptyCardText}>You have not submitted any reports yet.</Text>
            </View>
          )}

          <HeatmapPreview />
          <EventsCard events={dashEvents} />

        </View>
      </ScrollView>
    </View>
  );
}

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BORDER = '#e5e7eb';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7f8' },

  // Navbar
  navbar: {
    backgroundColor: TEAL,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 12,
  },
  burgerBtn: { padding: 4 },

  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifContainer: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Hero
heroBannerWrap: {
  backgroundColor: '#fff',
  paddingHorizontal: 16,
  paddingVertical: 16,
},
heroCard: {
  borderRadius: 16,
  overflow: 'hidden',
  width: '100%',
},
heroOverlay: {
  backgroundColor: 'rgba(3,127,129,0.6)',
  padding: 20,
  borderRadius: 16,
},
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statDot: {
    position: 'absolute',
    top: -14,
    left: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ORANGE,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  statNum: { color: '#fff', fontSize: 36, fontWeight: '800', marginLeft: 24 },
  statLabel: { color: '#fff', fontSize: 14, lineHeight: 20 },

  // Content
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  content: { padding: 16, gap: 16 },

  // Section Heading
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  headingLine: { width: 24, height: 2, backgroundColor: ORANGE, borderRadius: 2 },
  headingLineRight: { flex: 1, height: 2, backgroundColor: ORANGE, borderRadius: 2, opacity: 0.3 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },

  // Action Card
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    paddingTop: 40,
    position: 'relative',
    marginTop: 20,
  },
  actionIconWrap: {
    position: 'absolute',
    top: -20,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e1f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  actionIconImg: { width: 28, height: 28 },
  actionTitle: { fontSize: 20, fontWeight: '800', color: TEAL, marginBottom: 4 },
  actionDesc: { fontSize: 14, color: '#6b7280', marginBottom: 12 },

  // Status Card
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  cardHeader: {
    backgroundColor: TEAL,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  headerViewBtn: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: { padding: 14, gap: 4 },
  statusMeta: { fontSize: 13, color: '#1a1a1a' },

  // Stepper
  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepLine: {
    position: 'absolute',
    top: 10,
    right: '50%',
    left: '-50%',
    height: 2,
    backgroundColor: BORDER,
  },
  stepLineDone: { backgroundColor: TEAL },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BORDER,
    borderWidth: 2,
    borderColor: BORDER,
    zIndex: 1,
  },
  stepDotDone: { backgroundColor: TEAL, borderColor: TEAL },
  stepDotActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  stepLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  stepLabelActive: { color: '#1a1a1a', fontWeight: '700' },

  // Notifications
  notifItem: {
    backgroundColor: '#f5f7f8',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 6,
  },
  notifText: { fontSize: 13, color: '#1a1a1a' },

  // View Button
  viewBtn: {
    backgroundColor: ORANGE,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Heatmap
  heatmapCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
  },
  heatmapCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  heatmapTitleRow: { flexDirection: 'row', alignItems: 'center' },
  heatmapTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
  heatmapViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatmapViewBtnText: { fontSize: 12, fontWeight: '700', color: TEAL },
  heatmapMapWrap: { height: 200, position: 'relative' },
  heatmapMap: { width: '100%', height: '100%', backgroundColor: '#e8f4f4' },
  heatmapLegend: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    padding: 6,
    gap: 3,
  },
  heatmapLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heatmapLegendDot: { width: 8, height: 8, borderRadius: 2 },
  heatmapLegendText: { fontSize: 9, color: '#374151', fontWeight: '600' },

  // Events
  upcomingTitle: { fontSize: 14, fontWeight: '800', color: TEAL, marginBottom: 8 },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  eventThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#e1f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventThumbEmoji: { fontSize: 20 },
  eventImageThumb: { width: '100%', height: '100%', borderRadius: 8 },
  eventTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  eventDate: { fontSize: 11, color: '#6b7280' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
  },
});
