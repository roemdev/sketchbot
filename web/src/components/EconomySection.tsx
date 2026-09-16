import React from "react";
import { Landmark, Dices, MessageSquare, TrendingUp, Trophy, Gift, Sparkles } from "lucide-react";
import { VaultStats } from "../lib/types";
import styles from "./EconomySection.module.css";

interface EconomySectionProps {
  stats: VaultStats;
}

export default function EconomySection({ stats }: EconomySectionProps) {
  const formatMoney = (val: number) => {
    return "$" + new Intl.NumberFormat("en-US").format(val);
  };

  const progressionSteps = [
    {
      step: "Paso 01",
      title: "Participa en Voz & Chat",
      desc: "Acumula XP automáticamente al interactuar en canales de texto, salas de voz y partidas.",
      icon: <MessageSquare size={18} color="var(--color-primary)" />,
    },
    {
      step: "Paso 02",
      title: "Sube de Nivel & Rango",
      desc: "Escala en la jerarquía del servidor obteniendo mejores multiplicadores y acceso VIP.",
      icon: <TrendingUp size={18} color="var(--color-cyan)" />,
    },
    {
      step: "Paso 03",
      title: "Desbloquea Logros",
      desc: "Cumple metas comunitarias para asegurar insignias de estatus e incentivos monetarios.",
      icon: <Trophy size={18} color="var(--color-gold)" />,
    },
    {
      step: "Paso 04",
      title: "Reclama Recompensas",
      desc: "Cobra subsidios del Banco, bonos comunitarios y beneficios en los servidores dedicados.",
      icon: <Gift size={18} color="var(--color-purple)" />,
    },
  ];

  return (
    <section className={styles.section} id="economia">
      <div className="container">
        <h2 className="section-title">
          Economía & Niveles <span>ARKANIA</span>
        </h2>
        <p className="section-subtitle">
          Sistema financiero con respaldo real e interfaz por botones en Discord.
        </p>

        <div className={styles.economyMainCard}>
          <div className={styles.topGrid}>
            <div>
              <h3 className={styles.economyTitle}>Economía Real & Todo por Botones</h3>
              <p className={styles.economyDesc}>
                En ARKANIA no hay inflación: cada moneda proviene del Banco o del Casino del servidor. Además, manejas tu dinero, apuestas y recompensas haciendo clic directamente en botones interactivos dentro de Discord sin memorizar comandos.
              </p>
            </div>

            {/* BÓVEDAS EN FORMATO TARJETAS RESUMIDAS */}
            <div className={styles.vaultsPair}>
              <div className={styles.vaultMiniCard}>
                <div>
                  <div className={styles.vaultLabel}>FONDOS BANCO DEDICADO</div>
                  <div className={styles.vaultName}>Banco del Servidor</div>
                </div>
                <div className={styles.vaultValueBank}>{formatMoney(stats.bankBalance)}</div>
              </div>

              <div className={styles.vaultMiniCard}>
                <div>
                  <div className={styles.vaultLabel}>LIQUIDEZ CASINO DE LA CASA</div>
                  <div className={styles.vaultName}>Casino Central</div>
                </div>
                <div className={styles.vaultValueCasino}>{formatMoney(stats.casinoBalance)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* LÍNEA HORIZONTAL DE COLUMNAS DE PROGRESIÓN (XP & NIVELES) */}
        <div className={styles.progressionStrip}>
          <div className={styles.stripHeaderTitle}>Flujo de Progresión de Experiencia & Niveles</div>
          <div className={styles.progressionGrid}>
            {progressionSteps.map((s, idx) => (
              <div key={idx} className={styles.progressionCol}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={styles.colStepBadge}>{s.step}</span>
                  {s.icon}
                </div>
                <h4 className={styles.colTitle}>{s.title}</h4>
                <p className={styles.colDesc}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div className={styles.collectiblesNote}>
            <Sparkles size={16} color="var(--color-gold)" style={{ flexShrink: 0 }} />
            <span>
              <strong>Coleccionables extras:</strong> Obtén cartas y completa álbumes mediante sobres diarios e intercambios en la comunidad.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
