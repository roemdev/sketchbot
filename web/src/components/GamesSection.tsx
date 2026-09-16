"use client";

import React, { useState } from "react";
import { Gamepad2, Trophy, Copy, Check, ExternalLink, Server, Swords, Shield, Crosshair } from "lucide-react";
import serversData from "../data/servers.json";
import { GameServer } from "../lib/types";
import styles from "./GamesSection.module.css";

export default function GamesSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const servers = serversData as GameServer[];

  const handleCopyIp = (id: string, ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const topPlayedGames = [
    {
      id: "albion",
      name: "Albion Online",
      desc: "Gremio propio con base organizada, salidas a Zona Negra, caminos de Avalon y mazmorras de grupo.",
      badge: "⭐ MÁS JUGADO • GREMIO OFICIAL",
      icon: <Shield size={20} color="var(--color-primary)" />,
    },
    {
      id: "lol",
      name: "League of Legends",
      desc: "Salas diarias para formar premades de 5v5, partidas clasificatorias Flex y ARAM de diversión en comunidad.",
      badge: "⭐ MÁS JUGADO • SALAS DE VOZ 24/7",
      icon: <Swords size={20} color="var(--color-cyan)" />,
    },
  ];

  const otherGamesList = [
    {
      id: "minecraft",
      name: "Minecraft",
      desc: "Supervivencia comunitaria con protección de construcciones y economía conectada.",
      hasServer: true,
      serverData: servers.find((s) => s.id === "minecraft"),
    },
    {
      id: "palworld",
      name: "Palworld",
      desc: "Exploración de islas Palpagos, captura en equipo y bases automatizadas.",
      hasServer: true,
      serverData: servers.find((s) => s.id === "palworld"),
    },
    {
      id: "enshrouded",
      name: "Enshrouded",
      desc: "Action RPG cooperativo, exploración del Manto y construcción de fortalezas.",
      hasServer: true,
      serverData: servers.find((s) => s.id === "enshrouded"),
    },
    {
      id: "project-zomboid",
      name: "Project Zomboid",
      desc: "Supervivencia zombie hardcore, fortificación de bases y convoyes de autos.",
      hasServer: true,
      serverData: servers.find((s) => s.id === "project-zomboid"),
    },
    {
      id: "once-human",
      name: "Once Human",
      desc: "Asentamiento de clan, limpiezas de contaminación y raideos de temporada.",
      hasServer: false,
      squadTag: "Escuadra de Clan",
    },
  ];

  return (
    <section className={styles.section} id="juegos">
      <div className="container">
        <h2 className="section-title">
          Comunidad <span>Gaming</span>
        </h2>
        <p className="section-subtitle">
          Nuestros títulos más jugados y los servidores dedicados 24/7 alojados para la comunidad.
        </p>

        {/* UN SOLO BLOQUE INTEGRADO PARA TODOS LOS JUEGOS */}
        <div className={styles.singleBlockCard}>
          {/* SUBSECCIÓN: JUEGOS MÁS JUGADOS (ALBION Y LOL) */}
          <div className={styles.subSectionTitle}>
            <Trophy size={20} color="var(--color-gold)" />
            <span>Juegos Más Jugados</span>
          </div>

          <div className={styles.topPlayedGrid}>
            {topPlayedGames.map((g) => (
              <div key={g.id} className={styles.topGameCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={styles.topGameBadge}>{g.badge}</span>
                  {g.icon}
                </div>
                <h3 className={styles.topGameName}>{g.name}</h3>
                <p className={styles.topGameDesc}>{g.desc}</p>
              </div>
            ))}
          </div>

          {/* SUBSECCIÓN: OTROS JUEGOS (SERVIDORES & SQUADS) */}
          <div className={styles.subSectionTitle} style={{ marginTop: "10px" }}>
            <Gamepad2 size={20} color="var(--color-primary)" />
            <span>Otros Juegos de la Comunidad</span>
          </div>

          <div className={styles.otherGamesList}>
            {otherGamesList.map((game) => {
              const isCopied = game.hasServer && game.serverData && copiedId === game.serverData.id;
              return (
                <div key={game.id} className={styles.otherGameRow}>
                  <div className={styles.otherGameLeft}>
                    <span className={styles.otherGameName}>{game.name}</span>
                    {game.hasServer ? (
                      <span className={styles.dedicatedChip}>
                        <Server size={12} color="var(--color-primary)" />
                        <span>Servidor Dedicado 24/7</span>
                      </span>
                    ) : (
                      <span className={styles.squadChip}>
                        <Crosshair size={12} color="var(--color-cyan)" />
                        <span>{game.squadTag}</span>
                      </span>
                    )}
                    <span className={styles.otherGameDesc}>{game.desc}</span>
                  </div>

                  {game.hasServer && game.serverData && (
                    <button
                      className={`${styles.copyIpBtn} ${isCopied ? styles.copied : ""}`}
                      onClick={() => handleCopyIp(game.serverData!.id, game.serverData!.ip)}
                      title={`Copiar IP de ${game.name}`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={14} />
                          <span>¡IP Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copiar IP</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* SPONSOR FOOTER NOTE */}
          <div className={styles.sponsorFooterNote}>
            <span>Servidores dedicados de la comunidad alojados en</span>
            <a
              href="https://arkaniahost.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sponsorLink}
            >
              arkaniahost.xyz
              <ExternalLink size={12} style={{ marginLeft: "3px", display: "inline" }} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
