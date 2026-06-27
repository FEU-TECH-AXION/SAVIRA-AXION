import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import SideNav from '../../components/SideNav';
import HeaderAvatar from '../../components/HeaderAvatar';
import NavSearchButton from '../../components/NavSearchButton';
import NotificationBell from '../../components/NotificationBell';

const TEAL = '#037F81';
const ORANGE = '#E96433';
const BG = '#f5f7f8';
const BORDER = '#e5e7eb';

const emergencyContacts = [
  {
    name: 'Philippine National Police',
    label: 'Emergency hotline',
    contact: '911',
    description: 'Use this for urgent danger, immediate police assistance, or emergency response.',
  },
  {
    name: 'PNP Women and Children Protection Center',
    label: 'Camp Crame, Quezon City',
    contact: '(02) 8352-6690 / 7410-3213 / 7723-0401 local 5260, 5360, 5361',
    description: 'Main office support for women and children protection concerns.',
  },
  {
    name: 'Aling Pulis Text Hotline',
    label: 'Text hotline',
    contact: '0919-7777-377 / 0966-7255-961 / 0920-9071-717',
    description: 'Text-based reporting channel listed by IACVAWC for VAWC-related concerns.',
  },
  {
    name: 'PNP WCPC Mindanao',
    label: 'Mindanao contact',
    contact: '0917-180-6037',
    description: 'Regional contact for women and children protection concerns in Mindanao.',
  },
];

const agencyContacts = [
  { name: "NBI Anti-Violence Against Women and Children Division", location: 'Taft Avenue, Manila', contact: '(02) 8525-6028' },
  { name: "Public Attorney's Office", location: 'Department of Justice', contact: '(02) 8929-9436 local 106, 107, or local 0 for operator' },
  { name: 'Council for the Welfare of Children Makabata Helpline', location: 'Child welfare and protection helpline', contact: '0915-8022-375 / 0960-3779-863' },
  { name: 'Civil Service Commission Public Assistance Desk', location: 'For government employees', contact: '(02) 8931-7913 / 8931-8187' },
  { name: 'Civil Service Commission Para sa Taumbayan Hotline', location: 'For government employees', contact: '(02) 8951-2575 / 8932-0111' },
];

const legalResources = [
  {
    category: 'Online Harassment',
    laws: [
      {
        title: 'Cybercrime Prevention Act of 2012 (RA 10175)',
        text: 'Criminalizes various online offenses, including cyberbullying, cybersex, and online libel. Victims of online harassment can file complaints with the appropriate authorities.',
        href: 'https://www.officialgazette.gov.ph/2012/09/12/republic-act-no-10175/',
      },
    ],
  },
  {
    category: 'Rape / Sexual Assault',
    laws: [
      {
        title: 'Anti-Rape Law of 1997 (RA 8353)',
        text: 'Defines and penalizes rape, including marital rape, and provides for the protection and support of rape victims.',
        href: 'https://lawphil.net/statutes/repacts/ra1997/ra_8353_1997.html',
      },
      {
        title: 'RA 11648 - Stronger Protection Against Rape and Sexual Exploitation',
        text: 'Provides stronger protection against rape, sexual exploitation, and abuse, and increases the age for determining statutory rape.',
        href: 'https://lawphil.net/statutes/repacts/ra1997/ra_8353_1997.html',
      },
    ],
  },
  {
    category: 'Stalking',
    laws: [
      {
        title: 'Safe Spaces Act (RA 11313)',
        text: 'The Philippines does not have a law specifically named for stalking, but related acts such as harassment and threats are covered as offenses under this law.',
        href: 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html',
      },
    ],
  },
  {
    category: 'Sharing or Showing Sexual Content',
    laws: [
      {
        title: 'Anti-Child Pornography Act of 2009 (RA 9775)',
        text: 'Protects children from sexual exploitation, including the creation and dissemination of sexual content involving minors.',
        href: 'https://lawphil.net/statutes/repacts/ra2009/ra_9775_2009.html',
      },
      {
        title: 'Anti-Obscenity and Pornography Act of 2008',
        text: 'Covers the production and distribution of obscene or pornographic material.',
        href: 'https://lawphil.net/statutes/repacts/ra2009/ra_9775_2009.html',
      },
    ],
  },
  {
    category: 'Taking Photos or Videos Without Permission',
    laws: [
      {
        title: 'Anti-Photo and Video Voyeurism Act of 2009 (RA 9995)',
        text: "Defines and penalizes photo and video voyeurism, including taking photos or videos of a person's private area without consent.",
        href: 'https://privacy.gov.ph/data-privacy-act/',
      },
      {
        title: 'Related protections',
        text: "Taking photos or videos of a person's private areas without consent may also be addressed under the Revised Penal Code, the Data Privacy Act of 2012, and other laws.",
        href: 'https://privacy.gov.ph/data-privacy-act/',
      },
    ],
  },
  {
    category: 'Public Masturbation or Indecent Exposure',
    laws: [
      {
        title: 'Safe Spaces Act (RA 11313), Section 4',
        text: 'Gender-based street and public space sexual harassment includes public masturbation, flashing, groping, and unwanted verbal or physical advances.',
        href: 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html',
      },
    ],
  },
  {
    category: 'Touching or Groping Without Permission',
    laws: [
      {
        title: 'Safe Spaces Act (RA 11313), Section 4',
        text: 'Groping and unwanted physical advances in public spaces are covered as gender-based sexual harassment under this law.',
        href: 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html',
      },
    ],
  },
  {
    category: 'Sexual Comments or Catcalling',
    laws: [
      {
        title: 'Safe Spaces Act (RA 11313), Section 4',
        text: "Catcalling, sexist slurs, and persistent unwanted comments about a person's appearance in public spaces are penalized under this law.",
        href: 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html',
      },
    ],
  },
  {
    category: 'Domestic Violence',
    laws: [
      {
        title: 'Anti-Violence Against Women and Their Children Act (RA 9262)',
        text: 'Defines and penalizes violence committed against women and their children by a spouse, partner, or person with whom the victim has or had a relationship.',
        href: 'https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html',
      },
    ],
  },
  {
    category: 'Human Trafficking',
    laws: [
      {
        title: 'Anti-Trafficking in Persons Act of 2003 (RA 9208)',
        text: 'Criminalizes recruitment, transportation, transfer, harboring, or receipt of persons for exploitation, including forced labor and sexual exploitation.',
        href: 'https://lawphil.net/statutes/repacts/ra2003/ra_9208.html',
      },
      {
        title: 'RA 10364 - Expanded Anti-Trafficking in Persons Act',
        text: 'Expands RA 9208 by strengthening institutional mechanisms for the protection and support of trafficked persons and increasing penalties for violations.',
        href: 'https://lawphil.net/statutes/repacts/ra2013/ra_10364_2013.html',
      },
    ],
  },
];

const sourceLinks = [
  { href: 'https://iacvawc.gov.ph/report-abuse/', label: 'IACVAWC Report Abuse helplines' },
  { href: 'https://webapp.safecity.in/legal_resources', label: 'Safecity legal resources' },
];

function Navbar({ onBurger }) {
  return (
    <View style={s.navbar}>
      <Pressable onPress={onBurger} style={s.iconBtn}>
        <Ionicons name="menu" size={26} color="#fff" />
      </Pressable>
      <View style={s.navRight}>
        <NavSearchButton />
        <NotificationBell />
        <HeaderAvatar />
      </View>
    </View>
  );
}

function dialContact(contact) {
  const firstNumber = contact.split('/')[0].replace(/[^\d+]/g, '');
  if (firstNumber) Linking.openURL(`tel:${firstNumber}`);
}

function ContactCard({ item, agency = false }) {
  return (
    <View style={agency ? s.agencyCard : s.contactCard}>
      <View style={s.cardIcon}>
        <Ionicons name={agency ? 'location-outline' : 'call-outline'} size={20} color={TEAL} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardLabel}>{agency ? item.location : item.label}</Text>
        <Text style={s.cardTitle}>{item.name}</Text>
        <Text style={s.contactNumber}>{item.contact}</Text>
        {!agency && <Text style={s.cardText}>{item.description}</Text>}
        <View style={s.cardActions}>
          <Pressable style={s.callBtn} onPress={() => dialContact(item.contact)}>
            <Ionicons name="call" size={14} color="#fff" />
            <Text style={s.callBtnText}>Call</Text>
          </Pressable>
          <Pressable style={s.copyBtn} onPress={() => Linking.openURL(`sms:${item.contact.split('/')[0].trim()}`)}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={TEAL} />
            <Text style={s.copyBtnText}>Text</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function LegalAccordionItem({ entry, open, onPress }) {
  return (
    <View style={s.accordionItem}>
      <Pressable style={s.accordionTrigger} onPress={onPress}>
        <Text style={s.accordionTitle}>{entry.category}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={TEAL} />
      </Pressable>
      {open && (
        <View style={s.accordionPanel}>
          {entry.laws.map((law) => (
            <View key={law.title} style={s.lawEntry}>
              <Text style={s.lawTitle}>{law.title}</Text>
              <Text style={s.lawText}>{law.text}</Text>
              <Pressable style={s.lawLink} onPress={() => Linking.openURL(law.href)}>
                <Text style={s.lawLinkText}>Read the law</Text>
                <Feather name="external-link" size={13} color={TEAL} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function HelplinesScreen() {
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState(null);

  return (
    <View style={s.container}>
      <SideNav open={navOpen} onClose={() => setNavOpen(false)} />
      <Navbar onBurger={() => setNavOpen(true)} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.hero}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={16} color="#fff" />
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <Text style={s.eyebrow}>Immediate help and trusted referrals</Text>
          <Text style={s.heroTitle}>Helplines and Support Resources</Text>
          <Text style={s.heroText}>
            If you are in immediate danger, call emergency services first. These contacts can help with reporting, protection, legal aid, and survivor support.
          </Text>
        </View>

        <View style={s.emergencyBand}>
          <View style={s.emergencyIcon}>
            <Ionicons name="call" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.emergencyLabel}>Emergency assistance</Text>
            <Text style={s.emergencyText}>Call 911 if you need immediate police or emergency response.</Text>
          </View>
          <Pressable style={s.emergencyCallBtn} onPress={() => Linking.openURL('tel:911')}>
            <Text style={s.emergencyCallText}>Call</Text>
          </Pressable>
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionKicker}>Helplines</Text>
          <Text style={s.sectionTitle}>Contacts for urgent reporting</Text>
        </View>
        {emergencyContacts.map((item) => <ContactCard key={item.name} item={item} />)}

        <View style={s.sectionHeader}>
          <Text style={s.sectionKicker}>Agencies</Text>
          <Text style={s.sectionTitle}>Additional referral contacts</Text>
        </View>
        {agencyContacts.map((item) => <ContactCard key={item.name} item={item} agency />)}

        <View style={s.sectionHeader}>
          <Text style={s.sectionKicker}>Legal resources</Text>
          <Text style={s.sectionTitle}>Sexual violence laws under Philippine law</Text>
          <Text style={s.sectionSubtext}>
            Find the situation closest to what happened to you. This is general information, not legal advice.
          </Text>
        </View>
        {legalResources.map((entry) => (
          <LegalAccordionItem
            key={entry.category}
            entry={entry}
            open={openCategory === entry.category}
            onPress={() => setOpenCategory((current) => current === entry.category ? null : entry.category)}
          />
        ))}

        <View style={s.notePanel}>
          <View style={s.panelHeader}>
            <Ionicons name="shield-checkmark-outline" size={22} color={TEAL} />
            <View>
              <Text style={s.sectionKicker}>Before reaching out</Text>
              <Text style={s.noteTitle}>When contacting an agency</Text>
            </View>
          </View>
          <Text style={s.noteText}>
            Use the safest phone, email, or device available to you. If someone monitors your messages or browser history, consider reaching out from a trusted person's device, or ask a support worker to help you contact the agency. Write down dates, places, screenshots, witnesses, injuries, threats, and any previous reports, and keep copies somewhere only you can access safely.
          </Text>
        </View>

        <View style={s.notePanel}>
          <View style={s.panelHeader}>
            <Feather name="file-text" size={22} color={TEAL} />
            <View>
              <Text style={s.sectionKicker}>References</Text>
              <Text style={s.noteTitle}>Source links</Text>
            </View>
          </View>
          {sourceLinks.map((source) => (
            <Pressable key={source.href} style={s.sourceLink} onPress={() => Linking.openURL(source.href)}>
              <Text style={s.sourceText}>{source.label}</Text>
              <Feather name="external-link" size={14} color={TEAL} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  navbar: {
    backgroundColor: TEAL,
    height: 84,
    paddingTop: 34,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: { padding: 4 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  hero: {
    backgroundColor: TEAL,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: 18,
  },
  backText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  eyebrow: { color: '#c9f2f2', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 8 },
  heroText: { color: '#e9ffff', fontSize: 14, lineHeight: 21, marginTop: 10 },
  emergencyBand: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  emergencyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyLabel: { color: '#9a3412', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  emergencyText: { color: '#7c2d12', fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 2 },
  emergencyCallBtn: { backgroundColor: ORANGE, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  emergencyCallText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8 },
  sectionKicker: { color: TEAL, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  sectionTitle: { color: '#111827', fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 4 },
  sectionSubtext: { color: '#6b7280', fontSize: 13, lineHeight: 19, marginTop: 6 },
  contactCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  agencyCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f7f7',
  },
  cardBody: { flex: 1 },
  cardLabel: { color: '#6b7280', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0 },
  cardTitle: { color: '#111827', fontSize: 15, lineHeight: 20, fontWeight: '900', marginTop: 3 },
  contactNumber: { color: TEAL, fontSize: 14, lineHeight: 19, fontWeight: '900', marginTop: 5 },
  cardText: { color: '#4b5563', fontSize: 13, lineHeight: 18, marginTop: 6 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: TEAL, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  callBtnText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e6f7f7', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 },
  copyBtnText: { color: TEAL, fontSize: 12, fontWeight: '900' },
  accordionItem: { marginHorizontal: 16, marginBottom: 9, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  accordionTrigger: { padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  accordionTitle: { flex: 1, color: '#111827', fontSize: 14, fontWeight: '900' },
  accordionPanel: { paddingHorizontal: 14, paddingBottom: 14, gap: 12 },
  lawEntry: { borderTopWidth: 1, borderTopColor: '#eef2f2', paddingTop: 12 },
  lawTitle: { color: '#111827', fontSize: 13, fontWeight: '900', lineHeight: 18 },
  lawText: { color: '#4b5563', fontSize: 12, lineHeight: 18, marginTop: 5 },
  lawLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  lawLinkText: { color: TEAL, fontSize: 12, fontWeight: '900' },
  notePanel: { marginHorizontal: 16, marginTop: 14, backgroundColor: '#fff', borderRadius: 14, padding: 15, borderWidth: 1, borderColor: BORDER },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  noteTitle: { color: '#111827', fontSize: 17, fontWeight: '900', marginTop: 2 },
  noteText: { color: '#4b5563', fontSize: 13, lineHeight: 20 },
  sourceLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#eef2f2' },
  sourceText: { flex: 1, color: TEAL, fontSize: 13, lineHeight: 18, fontWeight: '900' },
});
