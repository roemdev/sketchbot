import React from "react";
import { Landmark, Dices, Info } from "lucide-react";
import { VaultStats } from "../lib/types";
import styles from "./VaultMonitor.module.css";

interface VaultMonitorProps {
  stats: VaultStats;
}

export default function VaultMonitor({ stats }: VaultMonitorProps) {
  const formatMoney = (val: number) => {
    return "$" + new Intl.NumberFormat("en-US").format(val);
  };

  return (
    <section className={styles.section} id="bovedas">
      <div className="container">
        <h2 className="section-title">
          Bóvedas del Servidor <span>ARKANIA</span>
        </h2>
        <p className="section-subtitle">
          El sistema financiero en vivo respaldado por la actividad real de la comunidad en Discord.
        </p>

        <div className={styles.vaultsGrid}>
          {/* BANCO CENTRAL */}
          <div className={`${styles.vaultCard} ${styles.bankCard}`} id="vault-bank">
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.vaultTitle}>Banco del Servidor</h3>
                <div className={styles.vaultSubtitle}>server_bank • Reserva Monetaria & Subsidios</div>
              </div>
              <div className={`${styles.iconCircle} ${styles.bankIcon}`}>
                <Landmark size={24} color="var(--color-emerald)" />
              </div>
            </div>

            <div className={styles.balanceBlock}>
              <div className={styles.balanceLabel}>Reservas Fiscales Actuales</div>
              <div className={styles.bankBalanceValue}>{formatMoney(stats.bankBalance)}</div>
            </div>

            <ul className={styles.detailList}>
              <li className={styles.detailItem}>
                <span className={styles.bulletEmerald}></span>
                <span><strong>Entradas:</strong> Impuestos de apuestas, multas de economía y comisiones de mercado.</span>
              </li>
              <li className={styles.detailItem}>
                <span className={styles.bulletEmerald}></span>
                <span><strong>Salidas:</strong> Recompensas por nivel, bono diario y premios de eventos comunitarios.</span>
              </li>
            </ul>
          </div>

          {/* CASINO CENTRAL */}
          <div className={`${styles.vaultCard} ${styles.casinoCard}`} id="vault-casino">
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.vaultTitle}>Casino Central</h3>
                <div className={styles.vaultSubtitle}>server_casino • Bóveda de Apuestas de la Casa</div>
              </div>
              <div className={`${styles.iconCircle} ${styles.casinoIcon}`}>
                <Dices size={24} color="var(--color-pink)" />
              </div>
            </div>

            <div className={styles.balanceBlock}>
              <div className={styles.balanceLabel}>Liquidez de la Casa</div>
              <div className={styles.casinoBalanceValue}>{formatMoney(stats.casinoBalance)}</div>
            </div>

            <ul className={styles.detailList}>
              <li className={styles.detailItem}>
                <span className={styles.bulletPink}></span>
                <span><strong>Entradas:</strong> Fichas apostadas en juegos de Blackjack, Minas, Torre y Smash Bros.</span>
              </li>
              <li className={styles.detailItem}>
                <span className={styles.bulletPink}></span>
                <span><strong>Salidas:</strong> Pago inmediato de multiplicadores y botes ganados por los jugadores.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.infoBox}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 700, color: "#ffffff", marginBottom: "6px", fontFamily: "var(--font-tech)", fontSize: "1.05rem" }}>
            <Info size={18} color="var(--color-cyan)" />
            <span>SISTEMA DE BALANCES EN TIEMPO REAL</span>
          </div>
          <p>
            En la economía de ARKANIA cada moneda circulante proviene de transacciones reales entre el Banco, el Casino y los usuarios. Esto garantiza que tus logros, ahorros y victorias conserven su valor intrínseco.
          </p>
        </div>
      </div>
    </section>
  );
}
