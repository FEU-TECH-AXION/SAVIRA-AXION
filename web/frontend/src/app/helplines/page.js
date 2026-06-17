"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FiArrowLeft,
  FiChevronDown,
  FiExternalLink,
  FiFileText,
  FiMapPin,
  FiPhone,
  FiShield,
} from "react-icons/fi";
import styles from "./helplines.module.css";

const emergencyContacts = [
  {
    name: "Philippine National Police",
    label: "Emergency hotline",
    contact: "911",
    description: "Use this for urgent danger, immediate police assistance, or emergency response.",
  },
  {
    name: "PNP Women and Children Protection Center",
    label: "Camp Crame, Quezon City",
    contact: "(02) 8352-6690 / 7410-3213 / 7723-0401 local 5260, 5360, 5361",
    description: "Main office support for women and children protection concerns.",
  },
  {
    name: "Aling Pulis Text Hotline",
    label: "Text hotline",
    contact: "0919-7777-377 / 0966-7255-961 / 0920-9071-717",
    description: "Text-based reporting channel listed by IACVAWC for VAWC-related concerns.",
  },
  {
    name: "PNP WCPC Mindanao",
    label: "Mindanao contact",
    contact: "0917-180-6037",
    description: "Regional contact for women and children protection concerns in Mindanao.",
  },
];

const agencyContacts = [
  {
    name: "NBI Anti-Violence Against Women and Children Division",
    location: "Taft Avenue, Manila",
    contact: "(02) 8525-6028",
  },
  {
    name: "Public Attorney's Office",
    location: "Department of Justice",
    contact: "(02) 8929-9436 local 106, 107, or local 0 for operator",
  },
  {
    name: "Council for the Welfare of Children Makabata Helpline",
    location: "Child welfare and protection helpline",
    contact: "0915-8022-375 / 0960-3779-863",
  },
  {
    name: "Civil Service Commission Public Assistance Desk",
    location: "For government employees",
    contact: "(02) 8931-7913 / 8931-8187",
  },
  {
    name: "Civil Service Commission Para sa Taumbayan Hotline",
    location: "For government employees",
    contact: "(02) 8951-2575 / 8932-0111",
  },
];

// Legal resources: Philippine laws relevant to sexual violence and harassment,
// grouped by the kind of incident a survivor may be searching for.
const legalResources = [
  {
    category: "Online Harassment",
    laws: [
      {
        title: "Cybercrime Prevention Act of 2012 (RA 10175)",
        text: "Criminalizes various online offenses, including cyberbullying, cybersex, and online libel. Victims of online harassment can file complaints with the appropriate authorities.",
        href: "https://www.officialgazette.gov.ph/2012/09/12/republic-act-no-10175/",
      },
    ],
  },
  {
    category: "Rape / Sexual Assault",
    laws: [
      {
        title: "Anti-Rape Law of 1997 (RA 8353)",
        text: "Defines and penalizes rape, including marital rape, and provides for the protection and support of rape victims.",
        href: "https://lawphil.net/statutes/repacts/ra1997/ra_8353_1997.html",
      },
      {
        title: "RA 11648 — Stronger Protection Against Rape and Sexual Exploitation",
        text: "Provides stronger protection against rape and sexual exploitation and abuse, and increases the age for determining the commission of statutory rape.",
        href: "https://lawphil.net/statutes/repacts/ra1997/ra_8353_1997.html",
      },
    ],
  },
  {
    category: "Stalking",
    laws: [
      {
        title: "Safe Spaces Act (RA 11313)",
        text: "The Philippines does not have a law specifically named for stalking, but related acts such as harassment and threats are covered as offenses under this law.",
        href: "https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html",
      },
    ],
  },
  {
    category: "Sharing or Showing Sexual Content",
    laws: [
      {
        title: "Anti-Child Pornography Act of 2009 (RA 9775)",
        text: "Protects children from sexual exploitation, including the creation and dissemination of sexual content involving minors.",
        href: "https://lawphil.net/statutes/repacts/ra2009/ra_9775_2009.html",
      },
      {
        title: "Anti-Obscenity and Pornography Act of 2008",
        text: "Covers the production and distribution of obscene or pornographic material.",
        href: "https://lawphil.net/statutes/repacts/ra2009/ra_9775_2009.html",
      },
    ],
  },
  {
    category: "Taking Photos or Videos Without Permission",
    laws: [
      {
        title: "Anti-Photo and Video Voyeurism Act of 2009 (RA 9995)",
        text: "Defines and penalizes photo and video voyeurism, including taking photos or videos of a person's private area without consent.",
        href: "https://privacy.gov.ph/data-privacy-act/",
      },
      {
        title: "Related protections",
        text: "Taking photos or videos of a person's private areas without consent may also be addressed under the Revised Penal Code's provisions on unjust vexation, harassment, or invasion of privacy, as well as the Data Privacy Act of 2012 and the Anti-Obscenity and Pornography Act of 2008.",
        href: "https://privacy.gov.ph/data-privacy-act/",
      },
    ],
  },
  {
    category: "Public Masturbation or Indecent Exposure",
    laws: [
      {
        title: "Safe Spaces Act (RA 11313), Section 4",
        text: "Gender-based street and public space sexual harassment includes catcalling, wolf-whistling, unwanted invitations, slurs, persistent uninvited comments or gestures, public masturbation or flashing of private parts, groping, and unwanted verbal or physical advances in public spaces such as alleys, roads, sidewalks, parks, buildings, schools, churches, malls, and public transport.",
        href: "https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html",
      },
    ],
  },
  {
    category: "Touching or Groping Without Permission",
    laws: [
      {
        title: "Safe Spaces Act (RA 11313), Section 4",
        text: "Groping and unwanted physical advances in public spaces are covered as gender-based sexual harassment under this law, alongside other unwanted physical and verbal conduct.",
        href: "https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html",
      },
    ],
  },
  {
    category: "Sexual Comments or Catcalling",
    laws: [
      {
        title: "Safe Spaces Act (RA 11313), Section 4",
        text: "Catcalling, wolf-whistling, sexist or misogynistic slurs, and persistent unwanted comments about a person's appearance in public spaces are penalized under this law.",
        href: "https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html",
      },
    ],
  },
  {
    category: "Domestic Violence",
    laws: [
      {
        title: "Anti-Violence Against Women and Their Children Act (RA 9262)",
        text: "Defines and penalizes violence committed against women and their children by a spouse, partner, or person with whom the victim has or had a relationship, including physical, sexual, psychological, and economic abuse.",
        href: "https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html",
      },
    ],
  },
  {
    category: "Human Trafficking",
    laws: [
      {
        title: "Anti-Trafficking in Persons Act of 2003 (RA 9208)",
        text: "Criminalizes recruitment, transportation, transfer, harboring, or receipt of persons for exploitation, including forced labor and sexual exploitation.",
        href: "https://lawphil.net/statutes/repacts/ra2003/ra_9208_2003.html",
      },
      {
        title: "RA 10364 — Expanded Anti-Trafficking in Persons Act",
        text: "Expands RA 9208 by strengthening institutional mechanisms for the protection and support of trafficked persons and increasing penalties for violations.",
        href: "https://lawphil.net/statutes/repacts/ra2003/ra_9208_2003.html",
      },
    ],
  },
];

const sourceLinks = [
  {
    href: "https://iacvawc.gov.ph/report-abuse/",
    label: "IACVAWC Report Abuse helplines",
  },
  {
    href: "https://webapp.safecity.in/legal_resources",
    label: "Safecity legal resources",
  },
];

function LegalAccordionItem({ entry, isOpen, onToggle }) {
  return (
    <div className={styles.accordionItem}>
      <button
        type="button"
        className={styles.accordionTrigger}
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{entry.category}</span>
        <FiChevronDown
          className={isOpen ? styles.accordionIconOpen : styles.accordionIcon}
        />
      </button>
      {isOpen && (
        <div className={styles.accordionPanel}>
          {entry.laws.map((law) => (
            <div className={styles.lawEntry} key={law.title}>
              <h4>{law.title}</h4>
              <p>{law.text}</p>
              <a href={law.href} target="_blank" rel="noreferrer">
                Read the law
                <FiExternalLink />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelplinesPage() {
  const [openCategory, setOpenCategory] = useState(null);

  function toggleCategory(category) {
    setOpenCategory((current) => (current === category ? null : category));
  }

  return (
    <main className={styles.pagewrapper}>
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowLine} />
            Immediate help and trusted referrals
          </p>
          <h1>Helplines and Support Resources</h1>
          <p>
            If you are in immediate danger, call emergency services first. These contacts can
            help with reporting, protection, legal aid, and survivor support.
          </p>
        </div>
      </section>

      <section className={styles.emergencyBand} aria-label="Emergency notice">
        <div className={styles.emergencyIcon}>
          <FiPhone />
        </div>
        <div>
          <span>Emergency assistance</span>
          <strong>Call 911 if you need immediate police or emergency response.</strong>
        </div>
      </section>

      <section className={styles.content}>
        <div className={styles.sectionHeading}>
          <p>Helplines</p>
          <h2>Contacts for urgent reporting</h2>
        </div>

        <div className={styles.priorityGrid}>
          {emergencyContacts.map((item) => (
            <article className={styles.contactCard} key={item.name}>
              <div className={styles.cardIcon}>
                <FiPhone />
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardLabel}>{item.label}</p>
                <h3>{item.name}</h3>
                <p className={styles.contactNumber}>{item.contact}</p>
                <p className={styles.cardText}>{item.description}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.sectionHeading}>
          <p>Agencies</p>
          <h2>Additional referral contacts</h2>
        </div>

        <div className={styles.agencyGrid}>
          {agencyContacts.map((item) => (
            <article className={styles.agencyItem} key={item.name}>
              <div className={styles.cardIcon}>
                <FiMapPin />
              </div>
              <div className={styles.cardBody}>
                <h3>{item.name}</h3>
                <p className={styles.cardText}>{item.location}</p>
                <p className={styles.contactNumber}>{item.contact}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.sectionHeading}>
          <p className={styles.sectionLabel}>Legal resources</p>
          <h2>Sexual violence laws under Philippine law</h2>
          <p className={styles.sectionSubtext}>
            Find the situation closest to what happened to you. Each entry links to the full text
            of the law. This is general information, not legal advice — for guidance specific to
            your case, contact PAO, NBI Anti-VAWC, or PNP WCPC.
          </p>
        </div>

        <div className={styles.accordion}>
          {legalResources.map((entry) => (
            <LegalAccordionItem
              entry={entry}
              isOpen={openCategory === entry.category}
              key={entry.category}
              onToggle={() => toggleCategory(entry.category)}
            />
          ))}
        </div>

        <section className={styles.safetyNote}>
          <div className={styles.panelHeader}>
            <FiShield />
            <div>
              <p>Before reaching out</p>
              <h2>When contacting an agency</h2>
            </div>
          </div>
          <p>
            Use the safest phone, email, or device available to you. If someone monitors your
            messages or browser history, consider reaching out from a trusted person&apos;s
            device, or ask a support worker to help you contact the agency. Write down dates,
            places, screenshots, witnesses, injuries, threats, and any previous reports, and keep
            copies somewhere only you can access safely.
          </p>
        </section>

        <section className={styles.sources}>
          <div className={styles.panelHeader}>
            <FiFileText />
            <div>
              <p>References</p>
              <h2>Source links</h2>
            </div>
          </div>
          <div className={styles.sourceLinks}>
            {sourceLinks.map((source) => (
              <a href={source.href} key={source.href} target="_blank" rel="noreferrer">
                {source.label}
                <FiExternalLink />
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}