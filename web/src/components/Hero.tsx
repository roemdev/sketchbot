import React from "react";
import Link from "next/link";
import { Gamepad2, Sparkles, ShieldCheck } from "lucide-react";
import styles from "./Hero.module.css";

interface HeroProps {
  discordUrl?: string;
}

export default function Hero({
  discordUrl = "https://discord.gg/jA8tx5Vwe5",
}: HeroProps) {
  return (
    <section className={styles.heroSection}>
      <div className={styles.heroGlowOrb}></div>

      <div className={`container ${styles.heroGrid}`}>
        {/* TEXTO A LA IZQUIERDA */}
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <ShieldCheck size={14} color="var(--color-primary)" />
            <span>COMUNIDAD DISCORD & ECONOMÍA PROPIA</span>
          </div>

          <h1 className={styles.title}>
            <span className={styles.titleHighlight}>ARKANIA</span>
          </h1>

          <p className={styles.tagline}>
            Una comunidad de Discord con <span>un poco de cianuro</span> pero con <span>mucho amor</span>.
          </p>

          {/* LOS DOS BOTONES PEDIDOS */}
          <div className={styles.ctaGroup}>
            <a
              href={discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-gaming-primary"
              id="hero-discord-cta"
            >
              <Gamepad2 size={18} />
              <span>Unirse al Discord</span>
            </a>

            <Link href="/cartas" className="btn btn-gaming-gold" id="hero-cards-cta">
              <Sparkles size={18} />
              <span>Ver Álbum de Cartas</span>
            </Link>
          </div>
        </div>

        {/* LOGO TENUE A LA DERECHA */}
        <div className={styles.heroLogoWrapper}>
          <div className={styles.heroLogoGlow}></div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="ARKANIA Logo" className={styles.heroWatermarkLogo} />
        </div>
      </div>
    </section>
  );
}
