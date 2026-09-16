import React from "react";
import { Coins, Zap, Sparkles, Gamepad2, Bot } from "lucide-react";
import styles from "./FeatureStrip.module.css";

export default function FeatureStrip() {
  const highlights = [
    {
      icon: <Coins size={20} color="var(--color-primary)" />,
      title: "Economía Real",
      desc: "Bóveda & Suma Cero",
    },
    {
      icon: <Zap size={20} color="var(--color-cyan)" />,
      title: "Niveles & Rangos",
      desc: "XP en Chat & Voz",
    },
    {
      icon: <Sparkles size={20} color="var(--color-gold)" />,
      title: "Coleccionables TCG",
      desc: "Sobres & Intercambio",
    },
    {
      icon: <Gamepad2 size={20} color="var(--color-purple)" />,
      title: "Variedad Gaming",
      desc: "Servidores & Squads",
    },
    {
      icon: <Bot size={20} color="var(--color-primary)" />,
      title: "Bot Propio",
      desc: "SketchBot Integrado",
    },
  ];

  return (
    <section className={styles.stripSection} id="destacados">
      <div className="container">
        <div className={styles.stripGrid}>
          {highlights.map((h, i) => (
            <div key={i} className={styles.stripItem}>
              <div className={styles.iconBox}>{h.icon}</div>
              <div className={styles.itemText}>
                <span className={styles.itemTitle}>{h.title}</span>
                <span className={styles.itemDesc}>{h.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
