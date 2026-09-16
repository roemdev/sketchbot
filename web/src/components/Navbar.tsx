"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, X, Gamepad2, Sparkles, Landmark, Dices } from "lucide-react";
import { VaultStats } from "../lib/types";
import styles from "./Navbar.module.css";

interface NavbarProps {
  serverUrl?: string;
  vaultStats?: VaultStats;
}

export default function Navbar({
  serverUrl = "https://discord.gg/jA8tx5Vwe5",
  vaultStats,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const formatCompactMoney = (val: number) => {
    return "$" + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(val);
  };

  return (
    <header className={styles.header}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.brand} id="navbar-brand-link">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="ARKANIA Logo" className={styles.logoImage} />
          <div className={styles.brandText}>
            <span className={styles.brandName}>ARKANIA</span>
            <span className={styles.brandSub}>DISCORD COMMUNITY</span>
          </div>
        </Link>

        <nav>
          <ul className={styles.navLinks}>
            <li>
              <a href="#destacados" className={styles.navLink} id="nav-link-destacados">
                Destacados
              </a>
            </li>
            <li>
              <a href="#juegos" className={styles.navLink} id="nav-link-juegos">
                Juegos
              </a>
            </li>
            <li>
              <a href="#economia" className={styles.navLink} id="nav-link-economia">
                Economía
              </a>
            </li>
            <li>
              <a href="#leaderboard" className={styles.navLink} id="nav-link-leaderboard">
                Ranking
              </a>
            </li>
            <li>
              <Link href="/cartas" className={styles.navLink} id="nav-link-cartas">
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <Sparkles size={13} color="var(--color-gold)" /> Cartas
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className={styles.actions}>
          {/* BALANCES MINIMALISTAS Y DISCRETOS PREVIOS AL BOTÓN */}
          {vaultStats && (
            <div className={styles.discreetVaults}>
              <span className={styles.vaultPill} title="Reservas del Banco del Servidor">
                <Landmark size={12} color="var(--color-primary)" />
                <span>Banco {formatCompactMoney(vaultStats.bankBalance)}</span>
              </span>
              <span className={styles.vaultPill} title="Liquidez del Casino Central">
                <Dices size={12} color="var(--color-purple)" />
                <span>Casino {formatCompactMoney(vaultStats.casinoBalance)}</span>
              </span>
            </div>
          )}

          {/* BOTÓN DISCORD MÁS PEQUEÑO Y COMPACTO */}
          <a
            href={serverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnCompactDiscord}
            id="navbar-join-discord-btn"
          >
            <Gamepad2 size={14} />
            <span>Discord</span>
          </a>

          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            id="navbar-mobile-toggle"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div
          style={{
            background: "rgba(10, 16, 12, 0.95)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-medium)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
          id="navbar-mobile-menu"
        >
          <a
            href="#destacados"
            onClick={() => setMobileOpen(false)}
            style={{ color: "#ffffff", fontWeight: 700, fontFamily: "var(--font-tech)", fontSize: "0.95rem" }}
          >
            DESTACADOS
          </a>
          <a
            href="#juegos"
            onClick={() => setMobileOpen(false)}
            style={{ color: "#ffffff", fontWeight: 700, fontFamily: "var(--font-tech)", fontSize: "0.95rem" }}
          >
            JUEGOS QUE JUGAMOS & HOSPEDAMOS
          </a>
          <a
            href="#economia"
            onClick={() => setMobileOpen(false)}
            style={{ color: "#ffffff", fontWeight: 700, fontFamily: "var(--font-tech)", fontSize: "0.95rem" }}
          >
            ECONOMÍA & NIVELES
          </a>
          <a
            href="#leaderboard"
            onClick={() => setMobileOpen(false)}
            style={{ color: "#ffffff", fontWeight: 700, fontFamily: "var(--font-tech)", fontSize: "0.95rem" }}
          >
            HALL OF FAME (RANKING)
          </a>
          <Link
            href="/cartas"
            onClick={() => setMobileOpen(false)}
            style={{ color: "var(--color-gold)", fontWeight: 700, fontFamily: "var(--font-tech)", fontSize: "0.95rem" }}
          >
            ÁLBUM & MERCADO DE CARTAS
          </Link>
          <a
            href={serverUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnCompactDiscord}
            style={{ marginTop: "8px", width: "100%", justifyContent: "center" }}
          >
            <Gamepad2 size={14} />
            <span>Unirse al Discord</span>
          </a>
        </div>
      )}
    </header>
  );
}
