"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import serversData from "../data/servers.json";
import { GameServer } from "../lib/types";
import styles from "./ServerList.module.css";

export default function ServerList() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const servers = serversData as GameServer[];

  const handleCopyIp = (id: string, ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section className={styles.section} id="servidores">
      <div className="container">
        <div className={styles.headerArea}>
          <h2 className="section-title">
            Servidores Dedicados <span>ARKANIA</span>
          </h2>
          <div className={styles.sponsorNote}>
            <span>Infraestructura dedicada alojada en</span>
            <a
              href="https://arkaniahost.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sponsorLink}
            >
              arkaniahost.xyz
              <ExternalLink size={13} style={{ marginLeft: "4px", display: "inline" }} />
            </a>
          </div>
        </div>

        <div className={styles.serversGrid}>
          {servers.map((srv) => {
            const isCopied = copiedId === srv.id;
            return (
              <div key={srv.id} className={styles.serverCard} id={`server-card-${srv.id}`}>
                {srv.image && (
                  <div className={styles.imageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={srv.image}
                      alt={srv.name}
                      className={styles.coverImage}
                      loading="lazy"
                    />
                    <div className={styles.imageBadge}>
                      <span className="status-dot-emerald"></span>
                      <span>ONLINE 24/7</span>
                    </div>
                  </div>
                )}

                <div className={styles.cardBody}>
                  <div>
                    <h3 className={styles.gameName}>{srv.name}</h3>
                    <div className={styles.gameGenre}>{srv.genre}</div>
                  </div>

                  <p className={styles.gameDesc}>{srv.description}</p>

                  {srv.highlights && srv.highlights.length > 0 && (
                    <ul className={styles.highlightsList}>
                      {srv.highlights.map((h, idx) => (
                        <li key={idx} className={styles.highlightItem}>
                          <span className={styles.highlightDot}></span>
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={`${styles.copyBtn} ${isCopied ? styles.copied : ""}`}
                    onClick={() => handleCopyIp(srv.id, srv.ip)}
                    id={`copy-ip-${srv.id}`}
                    aria-label={`Copiar IP de ${srv.name}`}
                  >
                    {isCopied ? (
                      <>
                        <Check size={15} />
                        <span>¡IP Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={15} />
                        <span>Copiar IP del Servidor</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
