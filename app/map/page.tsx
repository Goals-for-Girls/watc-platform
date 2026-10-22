import type { Metadata } from "next";
import { MapView } from "@/components/MapView";
import styles from "../inner.module.css";

export const metadata: Metadata = {
  title: "Map",
  description: "Where girls are leading We Are the Change projects.",
};

export default function MapPage() {
  return (
    <div className={`page ${styles.inner}`}>
      <header className={styles.head}>
        <h1>Project map</h1>
        <p className={styles.lead}>Choose a country, or tap a pin to see the projects that started there.</p>
      </header>
      <MapView view="world" />
    </div>
  );
}
