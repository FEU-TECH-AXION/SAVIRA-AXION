import LocationFacilityFinder from "@/components/locationFinder/LocationFacilityFinder";
import styles from "./hospital.module.css";

export default function HospitalPage() {
  return (
    <main className={styles.pageWrapper}>
      <div className={styles.pageInner}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            <span className={styles.heroLine} />
            Emergency Support
          </p>
          <h1 className={styles.title}>Hospitals Near You</h1>
          <p className={styles.description}>
            Search a location to find nearby hospitals and open directions in a map.
          </p>
        </section>

        <LocationFacilityFinder service="hospital" />
      </div>
    </main>
  );
}
