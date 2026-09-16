import React from "react";
import { Swords, Shield, Crosshair, Users } from "lucide-react";
import styles from "./CommunityGames.module.css";

export default function CommunityGames() {
  const games = [
    {
      id: "lol",
      name: "League of Legends",
      tag: "PREMADES • FLEX & ARAM",
      description:
        "Salas activas a diario para armar partidas en grupo, subir rango en competitivo y participar en minitorneos internos de la comunidad.",
      status: "Salas de Voz 24/7",
      icon: <Swords size={22} color="var(--color-cyan)" />,
    },
    {
      id: "albion",
      name: "Albion Online",
      tag: "GREMIO ARKANIA • ROAMING & ZONA NEGRA",
      description:
        "Gremio propio con base organizada. Salidas coordinadas a Zona Negra, dungeons de grupo, gankings y economía compartida.",
      status: "Gremio Oficial Activo",
      icon: <Shield size={22} color="var(--color-primary)" />,
    },
    {
      id: "once-human",
      name: "Once Human",
      tag: "ASENTAMIENTO DE CLAN • PURGAS & RAIDS",
      description:
        "Construcción de refugios de clan, misiones de temporada, limpieza de monolitos de contaminación y raideos en escuadra.",
      status: "Escuadra de Servidor",
      icon: <Crosshair size={22} color="var(--color-pink)" />,
    },
  ];

  return (
    <section className={styles.section} id="juegos-comunidad">
      <div className="container">
        <h2 className="section-title">
          Squads & Juegos <span>ARKANIA</span>
        </h2>
        <p className="section-subtitle">
          Organizamos grupos diarios en Discord para competir, formar premades y compartir partidas en los títulos más jugados.
        </p>

        <div className={styles.gamesGrid}>
          {games.map((g) => (
            <div key={g.id} className={styles.gameCard}>
              <div>
                <div className={styles.cardTop}>
                  <div>
                    <h3 className={styles.gameName}>{g.name}</h3>
                    <div className={styles.gameTag}>{g.tag}</div>
                  </div>
                  <div className={styles.iconBox}>{g.icon}</div>
                </div>
                <p className={styles.gameDesc} style={{ marginTop: "14px" }}>
                  {g.description}
                </p>
              </div>

              <div className={styles.cardFooter}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span className={styles.activeDot}></span>
                  <span>{g.status}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Users size={14} color="var(--color-cyan)" />
                  <span>Discord Voice</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
