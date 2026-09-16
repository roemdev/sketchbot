import React from "react";
import { Server, Coins, Dices, Mic } from "lucide-react";
import styles from "./Features.module.css";

export default function Features() {
  const features = [
    {
      icon: <Server size={24} color="var(--color-cyan)" />,
      title: "Servidores Dedicados 24/7",
      description:
        "Infraestructura propia con alto rendimiento para Minecraft, Palworld, Enshrouded y Project Zomboid, respaldos automáticos y soporte continuo.",
    },
    {
      icon: <Coins size={24} color="var(--color-gold)" />,
      title: "Economía Viva & Balanceada",
      description:
        "Ecosistema financiero en Discord respaldado por el Banco y el Casino del servidor, con mercado de cartas coleccionables e incentivos de actividad.",
    },
    {
      icon: <Dices size={24} color="var(--color-pink)" />,
      title: "Casino & Juegos Interactivos",
      description:
        "Blackjack 21, Minas, Torre de Riesgo y apuestas en torneos operados nativamente por SketchBot desde Discord.",
    },
    {
      icon: <Mic size={24} color="var(--color-primary)" />,
      title: "Salas de Voz Dinámicas",
      description:
        "Creación instantánea de canales temporales autogestionados por los usuarios, con ganancias pasivas de XP y roles de estatus por nivel.",
    },
  ];

  return (
    <section className={styles.section} id="ecosistema">
      <div className="container">
        <h2 className="section-title">
          Ecosistema <span>ARKANIA GAMING</span>
        </h2>
        <p className="section-subtitle">
          Pilares fundamentales diseñados para brindar la mejor experiencia en comunidad.
        </p>

        <div className={styles.featuresGrid}>
          {features.map((f, i) => (
            <div key={i} className={styles.featureCard}>
              <div className={styles.iconArea}>
                <div className={styles.iconBox}>{f.icon}</div>
                <h3 className={styles.featureTitle}>{f.title}</h3>
              </div>
              <p className={styles.featureText}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
