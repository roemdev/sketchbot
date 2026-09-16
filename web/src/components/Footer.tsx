import React from "react";
import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerGrid}>
          <div className={styles.brandCol}>
            <div className={styles.brandName}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="ARKANIA Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} />
              <span>ARKANIA</span>
            </div>
            <p className={styles.brandDesc}>
              Una comunidad de Discord con un poco de cianuro pero con mucho amor. Servidores dedicados 24/7, partidas en escuadra, economía viva y el mejor ambiente en Discord.
            </p>
            <div className={styles.statusIndicator}>
              <span className="status-dot-emerald"></span>
              <span>SERVIDORES & BOT OPERATIVOS</span>
            </div>
          </div>

          <div>
            <div className={styles.colTitle}>Navegación</div>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <a href="#destacados">Destacados</a>
              </li>
              <li className={styles.linkItem}>
                <a href="#juegos">Juegos & Servidores</a>
              </li>
              <li className={styles.linkItem}>
                <a href="#economia">Economía & Niveles</a>
              </li>
              <li className={styles.linkItem}>
                <a href="#leaderboard">Hall of Fame (Ranking)</a>
              </li>
            </ul>
          </div>

          <div>
            <div className={styles.colTitle}>Recursos & Mercado</div>
            <ul className={styles.linkList}>
              <li className={styles.linkItem}>
                <Link href="/cartas">Álbum & Mercado de Cartas</Link>
              </li>
              <li className={styles.linkItem}>
                <a href="https://arkaniahost.xyz" target="_blank" rel="noopener noreferrer">
                  Hosting ArkaniaHost
                </a>
              </li>
              <li className={styles.linkItem}>
                <a href="https://discord.gg/jA8tx5Vwe5" target="_blank" rel="noopener noreferrer">
                  Unirse al Discord
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <div>© {new Date().getFullYear()} ARKANIA DISCORD COMMUNITY • Impulsado por SketchBot</div>
          <div>Infraestructura de Hosting por arkaniahost.xyz</div>
        </div>
      </div>
    </footer>
  );
}
