"use client";

import React, { useEffect, useState } from "react";
import { Globe, Users } from "lucide-react";
import styles from "./LiveVisitors.module.css";

interface CountryVisitor {
  code: string;
  name: string;
  flag: string;
  count: number;
}

interface VisitorsData {
  currentVisitor: {
    code: string;
    name: string;
    flag: string;
  };
  onlineTotal: number;
  countries: CountryVisitor[];
}

export default function LiveVisitors() {
  const [data, setData] = useState<VisitorsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisitors() {
      try {
        const res = await fetch("/api/visitors");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch live visitors:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchVisitors();

    // Refresh every 45 seconds
    const interval = setInterval(fetchVisitors, 45000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>
          <div className={styles.pulseDot}></div>
          <span>Sincronizando visitantes en vivo...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.liveBadge}>
          <span className={styles.pulseDot}></span>
          <Users size={14} className={styles.icon} />
          <span className={styles.liveText}>
            EN LÍNEA AHORA: <strong className={styles.totalNumber}>{data.onlineTotal}</strong> VISITANTES
          </span>
        </div>

        {data.currentVisitor && (
          <div className={styles.myLocationBadge}>
            <Globe size={13} className={styles.globeIcon} />
            <span>
              Tu país: <strong>{data.currentVisitor.flag} {data.currentVisitor.name}</strong>
            </span>
          </div>
        )}
      </div>

      <div className={styles.flagsRow}>
        {data.countries.map((country) => (
          <div
            key={country.code}
            className={`${styles.countryCard} ${
              country.code === data.currentVisitor?.code ? styles.currentCountryHighlight : ""
            }`}
            title={`${country.name}: ${country.count} visitantes activos`}
          >
            <span className={styles.flag}>{country.flag}</span>
            <span className={styles.code}>{country.code}</span>
            <span className={styles.count}>{country.count}</span>
          </div>
        ))}
      </div>

      <div className={styles.footerNote}>
        <span>📡 Radar de presencia global • ARKANIA Live Traffic</span>
      </div>
    </div>
  );
}
