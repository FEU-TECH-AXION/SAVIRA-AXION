import LocationFacilityFinder from "@/components/locationFinder/LocationFacilityFinder";
import styles from "./police-station.module.css";

export default function PoliceStationPage() {
  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageInner}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.heroLine} />
            Public Safety
          </p>
          <h1 className={styles.title}>Police Stations Near You</h1>
          <p className={styles.description}>
            Search a location to find nearby police stations and open directions in a map.
          </p>
        </section>

        <LocationFacilityFinder service="police" />
      </div>
    </main>
  );
}
