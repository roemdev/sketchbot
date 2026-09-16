"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Calendar,
  ShoppingCart,
  Trophy,
  Zap,
  Rocket,
  Crown,
  BookOpen,
  Award,
  Eye,
  X,
  Lock,
  CheckCircle2,
  Camera,
  Download,
  Loader2,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import rawCards from "../../data/cards.json";
import { CollectorProfile } from "../../lib/types";
import { getTopCollectors } from "../../lib/dataService";
import styles from "./page.module.css";

interface CardItem {
  id: string;
  name: string;
  emoji: string;
  tier: number;
  anime: string;
  imageUrl: string;
}

const ALL_CARDS: CardItem[] = Object.entries(rawCards).map(([id, card]: [string, any]) => ({
  id,
  name: card.name,
  emoji: card.emoji,
  tier: card.tier,
  anime: card.anime,
  imageUrl: card.imageUrl,
}));

export default function CartasPage() {
  const [selectedTier, setSelectedTier] = useState<number | 0>(0); // 0 = Todas
  const [collectors, setCollectors] = useState<CollectorProfile[]>([]);
  const [activeAlbumCollector, setActiveAlbumCollector] = useState<CollectorProfile | null>(null);
  const [albumFilter, setAlbumFilter] = useState<"all" | "owned" | "missing" | "duplicates">("all");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  useEffect(() => {
    async function loadCollectors() {
      const top = await getTopCollectors(ALL_CARDS.length);
      setCollectors(top);
    }
    loadCollectors();
  }, []);

  const filteredCards =
    selectedTier === 0 ? ALL_CARDS : ALL_CARDS.filter((c) => c.tier === selectedTier);

  const getTierName = (tier: number) => {
    switch (tier) {
      case 4:
        return "Tier 4 // Legendaria";
      case 3:
        return "Tier 3 // Épica";
      case 2:
        return "Tier 2 // Rara";
      case 1:
        return "Tier 1 // Común";
      default:
        return "";
    }
  };

  const getTierBadgeClass = (tier: number) => {
    switch (tier) {
      case 4:
        return styles.tierBadge4;
      case 3:
        return styles.tierBadge3;
      case 2:
        return styles.tierBadge2;
      default:
        return styles.tierBadge1;
    }
  };

  const getTierHoverClass = (tier: number) => {
    switch (tier) {
      case 4:
        return styles.tier4Hover;
      case 3:
        return styles.tier3Hover;
      case 2:
        return styles.tier2Hover;
      default:
        return "";
    }
  };

  // Generador de imagen compacta con imágenes reales y halos de rareza (100% inmune a bloqueos CORS)
  const handleExportImage = async () => {
    if (!activeAlbumCollector) return;
    setIsGeneratingImage(true);

    try {
      let cardsToRender = ALL_CARDS.map((c) => ({
        card: c,
        qty: activeAlbumCollector.cardQuantities[c.id] || 0,
        isOwned: activeAlbumCollector.ownedCardKeys.includes(c.id),
      }));

      let filterLabel = "Todas las Cartas";
      if (albumFilter === "owned") {
        cardsToRender = cardsToRender.filter((item) => item.isOwned);
        filterLabel = "Cartas Poseídas";
      } else if (albumFilter === "missing") {
        cardsToRender = cardsToRender.filter((item) => !item.isOwned);
        filterLabel = "Cartas Faltantes";
      } else if (albumFilter === "duplicates") {
        cardsToRender = cardsToRender
          .filter((item) => item.qty > 1)
          .sort((a, b) => b.qty - a.qty);
        filterLabel = "Cartas Repetidas";
      }

      if (cardsToRender.length === 0) {
        setIsGeneratingImage(false);
        alert(`No hay cartas para exportar en el filtro "${filterLabel}".`);
        return;
      }

      // Cargar imágenes usando la ruta proxy local para evitar bloqueos por CORS en canvas
      const loadedImages = await Promise.all(
        cardsToRender.map(async (item) => {
          try {
            if (!item.card.imageUrl) return null;
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(item.card.imageUrl)}`;
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const blob = await res.blob();
              const objectUrl = URL.createObjectURL(blob);
              return new Promise<HTMLImageElement | null>((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = objectUrl;
              });
            }
          } catch (e) {
            console.error("Failed to proxy image:", e);
          }
          return null;
        })
      );

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsGeneratingImage(false);
        return;
      }

      // Dimensiones de cada carta (Estilo exacto a la Referencia 2)
      const cardWidth = 190;
      const cardHeight = 250;
      const padding = 16;
      const cols = Math.min(5, Math.max(1, cardsToRender.length));
      const rows = Math.ceil(cardsToRender.length / cols);

      const headerHeight = 85;
      const footerHeight = 40;

      const width = cols * (cardWidth + padding) + padding;
      const height = headerHeight + rows * (cardHeight + padding) + footerHeight;

      canvas.width = width;
      canvas.height = height;

      // Funciones auxiliares para esquinas redondeadas en canvas
      const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };

      const drawRoundedTopRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
      };

      const drawImageCover = (img: HTMLImageElement, x: number, y: number, w: number, h: number) => {
        const imgRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = w / h;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

        if (imgRatio > targetRatio) {
          sw = img.naturalHeight * targetRatio;
          sx = (img.naturalWidth - sw) / 2;
        } else {
          sh = img.naturalWidth / targetRatio;
          sy = (img.naturalHeight - sh) / 2;
        }

        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
      };

      // 1. Fondo principal oscuro (#0b0d12)
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(0, 0, width, height);

      // Banner de Encabezado
      ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
      ctx.fillRect(10, 10, width - 20, headerHeight - 15);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Textos del Encabezado
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif";
      ctx.fillText(`ARKANIA TCG • ${activeAlbumCollector.username}`, 24, 38);

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Álbum S1 Anime Storm  •  Filtro: ${filterLabel} (${cardsToRender.length} cartas)`, 24, 63);

      const getRarityColor = (tier: number) => {
        switch (tier) {
          case 4: return "#f59e0b"; // Dorado (Legendaria)
          case 3: return "#a855f7"; // Púrpura (Épica)
          case 2: return "#06b6d4"; // Cían (Rara)
          default: return "#10b981"; // Esmeralda (Común)
        }
      };

      const getRarityLabel = (tier: number) => {
        switch (tier) {
          case 4: return "LEGENDARIA";
          case 3: return "ÉPICA";
          case 2: return "RARA";
          default: return "COMÚN";
        }
      };

      // 2. Renderizar Cuadrícula de Cartas
      cardsToRender.forEach((item, idx) => {
        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const x = padding + c * (cardWidth + padding);
        const y = headerHeight + r * (cardHeight + padding);

        const rarityColor = getRarityColor(item.card.tier);

        // Halo luminoso de rareza (Shadow)
        ctx.shadowColor = item.isOwned ? rarityColor : "transparent";
        ctx.shadowBlur = item.isOwned ? (item.card.tier === 4 ? 22 : item.card.tier === 3 ? 18 : 14) : 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Fondo del marco de la carta
        ctx.fillStyle = "#151821";
        drawRoundedRect(x, y, cardWidth, cardHeight, 12);
        ctx.fill();

        // Borde según rareza
        ctx.strokeStyle = item.isOwned ? rarityColor : "rgba(255, 255, 255, 0.12)";
        ctx.lineWidth = item.isOwned ? 2 : 1;
        ctx.stroke();

        // Reset sombra para elementos internos
        ctx.shadowBlur = 0;

        // --- Ilustración Real del Personaje (Imagen Superior) ---
        const imgHeight = 150;
        ctx.save();
        drawRoundedTopRect(x + 1, y + 1, cardWidth - 2, imgHeight, 11);
        ctx.clip();

        const img = loadedImages[idx];
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.globalAlpha = item.isOwned ? 1.0 : 0.28;
          drawImageCover(img, x + 1, y + 1, cardWidth - 2, imgHeight);
          ctx.globalAlpha = 1.0;
        } else {
          // Fallback con emoji si no hay imagen
          ctx.fillStyle = "#1e2330";
          ctx.fillRect(x + 1, y + 1, cardWidth - 2, imgHeight);
          ctx.font = "46px sans-serif";
          ctx.textAlign = "center";
          ctx.globalAlpha = item.isOwned ? 1.0 : 0.3;
          ctx.fillText(item.card.emoji || "🎴", x + cardWidth / 2, y + 90);
          ctx.globalAlpha = 1.0;
          ctx.textAlign = "left";
        }

        if (!item.isOwned) {
          ctx.fillStyle = "rgba(10, 12, 17, 0.65)";
          ctx.fillRect(x + 1, y + 1, cardWidth - 2, imgHeight);
        }
        ctx.restore();

        // --- Badge de Cantidad (✓ x12) arriba a la derecha ---
        if (item.isOwned) {
          const badgeWidth = 46;
          const badgeHeight = 22;
          const badgeX = x + cardWidth - badgeWidth - 8;
          const badgeY = y + 8;

          ctx.fillStyle = "#10b981"; // Verde esmeralda
          drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 11);
          ctx.fill();

          ctx.fillStyle = "#022c22"; // Texto oscuro
          ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
          ctx.fillText(`✓ x${item.qty}`, badgeX + 6, badgeY + 15);
        } else {
          const badgeWidth = 26;
          const badgeHeight = 22;
          const badgeX = x + cardWidth - badgeWidth - 8;
          const badgeY = y + 8;

          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          drawRoundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 11);
          ctx.fill();

          ctx.font = "11px sans-serif";
          ctx.fillText("🔒", badgeX + 7, badgeY + 15);
        }

        // --- Información Inferior de la Carta ---
        const infoY = y + imgHeight + 4;

        // Línea 1: Emoji + Nombre del personaje (Blanco Negrita)
        ctx.fillStyle = item.isOwned ? "#ffffff" : "#6b7280";
        ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
        const charName = item.card.name.length > 17 ? item.card.name.substring(0, 16) + "…" : item.card.name;
        ctx.fillText(`${item.card.emoji} ${charName}`, x + 10, infoY + 18);

        // Línea 2: Nombre del Anime
        ctx.fillStyle = item.isOwned ? "#9ca3af" : "#4b5563";
        ctx.font = "11px system-ui, -apple-system, sans-serif";
        const animeName = item.card.anime.length > 20 ? item.card.anime.substring(0, 19) + "…" : item.card.anime;
        ctx.fillText(animeName, x + 10, infoY + 36);

        // Línea 3: Pill de Rareza inferior (ej: TIER 1 // COMÚN)
        const pillX = x + 10;
        const pillY = infoY + 48;
        const pillW = cardWidth - 20;
        const pillH = 22;

        ctx.fillStyle = item.isOwned ? `${rarityColor}18` : "rgba(255, 255, 255, 0.04)";
        drawRoundedRect(pillX, pillY, pillW, pillH, 6);
        ctx.fill();

        ctx.strokeStyle = item.isOwned ? `${rarityColor}88` : "rgba(255, 255, 255, 0.1)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = item.isOwned ? rarityColor : "#6b7280";
        ctx.font = "bold 9.5px monospace, sans-serif";
        ctx.fillText(`TIER ${item.card.tier} // ${getRarityLabel(item.card.tier)}`, pillX + 8, pillY + 15);
      });

      // 3. Pie de Imagen
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px system-ui, -apple-system, sans-serif";
      ctx.fillText("Comunidad Discord ARKANIA • discord.gg/jA8tx5Vwe5 • arkaniahost.xyz", 24, height - 15);

      // Exportar a PNG y descargar
      canvas.toBlob((blob) => {
        if (!blob) {
          setIsGeneratingImage(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ARKANIA_${activeAlbumCollector.username}_${filterLabel.replace(/\s+/g, "_")}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsGeneratingImage(false);
      }, "image/png");
    } catch (err) {
      console.error("Error al exportar la imagen:", err);
      alert("Ocurrió un error al generar la imagen.");
      setIsGeneratingImage(false);
    }
  };

  return (
    <div className={styles.page}>
      <Navbar />

      <main className={styles.main}>
        <div className="container">
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>Volver al Inicio</span>
          </Link>

          <div className={styles.headerArea}>
            {/* CHIPS DE TEMPORADA PEDIDOS */}
            <div className={styles.seasonChipsRow}>
              <div className={styles.seasonChipActive}>
                <Zap size={14} color="var(--color-gold)" />
                <span>TEMPORADA ACTIVA: S1 - ANIME STORM</span>
              </div>
              <div className={styles.seasonChipNext}>
                <Rocket size={14} color="var(--color-primary)" />
                <span>¡Trabajando en la Temporada 2! 🚀</span>
              </div>
            </div>

            <h1 className={styles.title}>
              Álbum & Mercado de <span>Cartas</span>
            </h1>
            <p className={styles.subtitle}>
              Abre sobres con tus monedas ganadas en Discord, realiza intercambios con otros miembros, completa secciones de tu álbum S1 - Anime Storm y desbloquea recompensas.
            </p>
          </div>

          {/* SECCIÓN HALL OF FAME DE COLECCIONISTAS & ÁLBUMES DE USUARIOS */}
          {collectors.length > 0 && (
            <div className={styles.collectorsSection}>
              <div className={styles.collectorsHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Trophy size={22} color="var(--color-gold)" />
                  <h2 className={styles.collectorsTitle}>
                    Hall of Fame • <span>Coleccionistas & Álbumes S1</span>
                  </h2>
                </div>
                <div className={styles.albumSubtitle}>
                  Haz clic en cualquier tarjeta de coleccionista o progreso de álbum para ver sus cartas descubiertas.
                </div>
              </div>

              <div className={styles.collectorsGrid}>
                {collectors.slice(0, 3).map((user, idx) => {
                  return (
                    <div
                      key={user.discord_id}
                      className={`${styles.collectorCard} ${idx === 0 ? styles.collectorCardGold : ""}`}
                      onClick={() => {
                        setActiveAlbumCollector(user);
                        setAlbumFilter("all");
                      }}
                      title={`Haz clic para abrir el álbum completo de ${user.username}`}
                    >
                      <div className={styles.collectorRankBadge}>
                        {idx === 0 ? <Crown size={14} /> : null}
                        <span>{idx === 0 ? "#1 MAESTRO ÁLBUM" : `#${idx + 1} COLECCIONISTA`}</span>
                      </div>

                      <div className={styles.collectorAvatar}>
                        {user.username.slice(0, 2).toUpperCase()}
                      </div>

                      <div className={styles.collectorName}>{user.username}</div>
                      <div className={styles.collectorSubtitle}>
                        {idx === 0 ? "🏆 Leyenda de la S1" : `Coleccionista Nivel ${user.level}`}
                      </div>

                      {/* PROGRESO REAL DE ÁLBUM (CLICABLE) */}
                      <div className={styles.progressContainer}>
                        <div className={styles.progressHeader}>
                          <span>Álbum S1 Anime Storm</span>
                          <span style={{ color: "var(--color-gold)", fontWeight: 700 }}>
                            {user.completionPct}% ({user.cardsCount}/{ALL_CARDS.length})
                          </span>
                        </div>
                        <div className={styles.progressBarBg}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${user.completionPct}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className={styles.collectorStatsRow}>
                        <div className={styles.collectorStatPill}>
                          <BookOpen size={14} color="var(--color-cyan)" />
                          <span>{user.cardsCount} / {ALL_CARDS.length} Cartas</span>
                        </div>
                        <div className={styles.collectorStatPill}>
                          <Award size={14} color="var(--color-gold)" />
                          <span>{user.tier4Count} Legendarias</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TABLA RESTO DE POSICIONES (#4 y #5) */}
              {collectors.length > 3 && (
                <div className={styles.collectorsTableCard}>
                  <table className={styles.collectorsTable}>
                    <thead>
                      <tr>
                        <th>POSICIÓN</th>
                        <th>COLECCIONISTA</th>
                        <th>ÁLBUM S1</th>
                        <th style={{ textAlign: "right" }}>CARTAS / LEGENDARIAS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collectors.slice(3, 5).map((user, idx) => {
                        return (
                          <tr
                            key={user.discord_id}
                            className={styles.clickableTableRow}
                            onClick={() => {
                              setActiveAlbumCollector(user);
                              setAlbumFilter("all");
                            }}
                            title={`Haz clic para ver el álbum de ${user.username}`}
                          >
                            <td style={{ color: "var(--color-cyan)", fontWeight: 700 }}>
                              #{idx + 4}
                            </td>
                            <td style={{ fontWeight: 700, color: "#ffffff" }}>{user.username}</td>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div className={styles.tableProgressBg}>
                                  <div
                                    className={styles.tableProgressFill}
                                    style={{ width: `${user.completionPct}%` }}
                                  ></div>
                                </div>
                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                  {user.completionPct}% ({user.cardsCount}/{ALL_CARDS.length})
                                </span>
                              </div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-gold)" }}>
                              {user.cardsCount} cartas • {user.tier4Count} ⭐ Tier 4
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* GUÍA DE SOBRES */}
          <div className={styles.guideGrid}>
            <div className={styles.guideCard}>
              <div className={styles.guideTitle}>
                <ShoppingCart size={20} color="var(--color-cyan)" />
                <span>¿Qué incluye cada sobre?</span>
              </div>
              <p className={styles.guideText}>
                Cada sobre incluye <strong>3 cartas aleatorias</strong> de personajes con 4 niveles de rareza. Las abres en Discord con animación interactiva.
              </p>
            </div>

            <div className={styles.guideCard}>
              <div className={styles.guideTitle}>
                <Calendar size={20} color="var(--color-primary)" />
                <span>Sobres Diarios & Mercado</span>
              </div>
              <p className={styles.guideText}>
                Reclama <strong>1 sobre gratis cada 24h</strong> en el bot. También puedes adquirir sobres en el mercado de Discord usando las monedas de tus juegos y actividades.
              </p>
            </div>

            <div className={styles.guideCard}>
              <div className={styles.guideTitle}>
                <Trophy size={20} color="var(--color-gold)" />
                <span>Premios por Colección</span>
              </div>
              <p className={styles.guideText}>
                Completar colecciones en tu álbum te desbloquea <strong>roles de estatus en Discord</strong>, bonificaciones en la economía y tu lugar en el Hall of Fame.
              </p>
            </div>
          </div>

          {/* TABLA DE PROBABILIDADES */}
          <div className={styles.oddsSection}>
            <div className={styles.oddsHeader}>
              <Zap size={20} color="var(--color-gold)" />
              <span>Probabilidades Oficiales por Sobre</span>
            </div>

            <div className={styles.oddsGrid}>
              <div className={styles.oddsCard}>
                <div className={styles.tierLabel}>Comunes (Tier 1)</div>
                <div className={styles.tierPercent} style={{ color: "var(--text-secondary)" }}>50%</div>
                <div className={styles.tierDesc}>La base de la colección</div>
              </div>

              <div className={styles.oddsCard}>
                <div className={styles.tierLabel}>Raras (Tier 2)</div>
                <div className={styles.tierPercent} style={{ color: "var(--color-cyan)" }}>30%</div>
                <div className={styles.tierDesc}>Personajes destacados</div>
              </div>

              <div className={styles.oddsCard}>
                <div className={styles.tierLabel}>Épicas (Tier 3)</div>
                <div className={styles.tierPercent} style={{ color: "var(--color-primary)" }}>15%</div>
                <div className={styles.tierDesc}>Luchadores pesados y codiciados</div>
              </div>

              <div className={styles.oddsCard}>
                <div className={styles.tierLabel}>Legendarias (Tier 4)</div>
                <div className={styles.tierPercent} style={{ color: "var(--color-gold)" }}>5%</div>
                <div className={styles.tierDesc}>Goku, Naruto, Luffy y los titanes</div>
              </div>
            </div>
          </div>

          {/* CATÁLOGO DE CARTAS */}
          <div className={styles.gallerySection}>
            <div style={{ textAlign: "center", marginBottom: "26px" }}>
              <h2 style={{ fontSize: "1.6rem", fontWeight: 900, marginBottom: "8px", fontFamily: "var(--font-display)" }}>
                Catálogo de Cartas ({ALL_CARDS.length} Cartas)
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.94rem" }}>
                Filtra por nivel de rareza para conocer las cartas disponibles en los sobres.
              </p>
            </div>

            <div className={styles.filterGroup}>
              <button
                className={`${styles.filterBtn} ${selectedTier === 0 ? styles.filterActive : ""}`}
                onClick={() => setSelectedTier(0)}
              >
                Todas ({ALL_CARDS.length})
              </button>
              <button
                className={`${styles.filterBtn} ${selectedTier === 4 ? styles.filterActive : ""}`}
                onClick={() => setSelectedTier(4)}
              >
                Tier 4 // Legendarias ({ALL_CARDS.filter((c) => c.tier === 4).length})
              </button>
              <button
                className={`${styles.filterBtn} ${selectedTier === 3 ? styles.filterActive : ""}`}
                onClick={() => setSelectedTier(3)}
              >
                Tier 3 // Épicas ({ALL_CARDS.filter((c) => c.tier === 3).length})
              </button>
              <button
                className={`${styles.filterBtn} ${selectedTier === 2 ? styles.filterActive : ""}`}
                onClick={() => setSelectedTier(2)}
              >
                Tier 2 // Raras ({ALL_CARDS.filter((c) => c.tier === 2).length})
              </button>
              <button
                className={`${styles.filterBtn} ${selectedTier === 1 ? styles.filterActive : ""}`}
                onClick={() => setSelectedTier(1)}
              >
                Tier 1 // Comunes ({ALL_CARDS.filter((c) => c.tier === 1).length})
              </button>
            </div>

            <div className={styles.cardsGrid}>
              {filteredCards.map((card) => (
                <div key={card.id} className={`${styles.cardItem} ${getTierHoverClass(card.tier)}`}>
                  <div className={styles.cardImageWrapper}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      className={styles.cardImage}
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.cardInfo}>
                    <div className={styles.cardName} title={card.name}>
                      <span>{card.emoji}</span>
                      <span>{card.name}</span>
                    </div>
                    <div className={styles.cardAnime}>{card.anime}</div>
                    <div className={`${styles.cardBadge} ${getTierBadgeClass(card.tier)}`}>
                      {getTierName(card.tier)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL INTERACTIVO DE ÁLBUM DEL USUARIO */}
      {activeAlbumCollector && (
        <div className={styles.modalBackdrop} onClick={() => setActiveAlbumCollector(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.modalAvatar}>
                  {activeAlbumCollector.username.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className={styles.modalTitle}>
                    Álbum S1 • {activeAlbumCollector.username}
                  </h3>
                  <div className={styles.modalSubtitle}>
                    Progreso real: {activeAlbumCollector.cardsCount}/{ALL_CARDS.length} Cartas ({activeAlbumCollector.completionPct}%) • {activeAlbumCollector.tier4Count} ⭐ Legendarias
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {/* Ocultado temporalmente por solicitud del usuario */}
                {false && (
                  <button
                    className={styles.exportImageBtn}
                    onClick={handleExportImage}
                    disabled={isGeneratingImage}
                    title="Descargar imagen resumida para pegar en Discord"
                  >
                    {isGeneratingImage ? (
                      <>
                        <Loader2 size={14} className="spin" style={{ animation: "spin 1s linear infinite" }} />
                        <span>Generando...</span>
                      </>
                    ) : (
                      <>
                        <Camera size={14} />
                        <span>Imagen para Discord</span>
                      </>
                    )}
                  </button>
                )}

                <button
                  className={styles.closeBtn}
                  onClick={() => setActiveAlbumCollector(null)}
                >
                  <X size={16} />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>

            {/* CONTROLES Y SELECCIONADOR DE USUARIO */}
            <div className={styles.modalControlsRow}>
              <div className={styles.userSelectLabel}>
                <span>Coleccionista:</span>
                <select
                  className={styles.userSelect}
                  value={activeAlbumCollector.discord_id}
                  onChange={(e) => {
                    const selected = collectors.find((c) => c.discord_id === e.target.value);
                    if (selected) setActiveAlbumCollector(selected);
                  }}
                >
                  {collectors.map((c) => (
                    <option key={c.discord_id} value={c.discord_id}>
                      {c.username} ({c.cardsCount}/{ALL_CARDS.length})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalFilterGroup}>
                <button
                  className={`${styles.modalFilterBtn} ${albumFilter === "all" ? styles.modalFilterActive : ""}`}
                  onClick={() => setAlbumFilter("all")}
                >
                  Todas ({ALL_CARDS.length})
                </button>
                <button
                  className={`${styles.modalFilterBtn} ${albumFilter === "owned" ? styles.modalFilterActive : ""}`}
                  onClick={() => setAlbumFilter("owned")}
                >
                  Poseídas ({activeAlbumCollector.ownedCardKeys.length})
                </button>
                <button
                  className={`${styles.modalFilterBtn} ${albumFilter === "duplicates" ? styles.modalFilterActive : ""}`}
                  onClick={() => setAlbumFilter("duplicates")}
                >
                  Repetidas ({Object.values(activeAlbumCollector.cardQuantities).filter((q) => q > 1).length})
                </button>
                <button
                  className={`${styles.modalFilterBtn} ${albumFilter === "missing" ? styles.modalFilterActive : ""}`}
                  onClick={() => setAlbumFilter("missing")}
                >
                  Faltantes ({ALL_CARDS.length - activeAlbumCollector.ownedCardKeys.length})
                </button>
              </div>
            </div>

            {/* GRID DE CARTAS DEL ÁLBUM */}
            <div className={styles.modalGrid}>
              {ALL_CARDS.filter((card) => {
                const isOwned = activeAlbumCollector.ownedCardKeys.includes(card.id);
                const qty = activeAlbumCollector.cardQuantities[card.id] || 0;
                if (albumFilter === "owned") return isOwned;
                if (albumFilter === "missing") return !isOwned;
                if (albumFilter === "duplicates") return qty > 1;
                return true;
              })
                .sort((a, b) => {
                  if (albumFilter === "duplicates") {
                    const qtyA = activeAlbumCollector.cardQuantities[a.id] || 0;
                    const qtyB = activeAlbumCollector.cardQuantities[b.id] || 0;
                    return qtyB - qtyA; // De mayor a menor repetida
                  }
                  return 0;
                })
                .map((card) => {
                const isOwned = activeAlbumCollector.ownedCardKeys.includes(card.id);
                const qty = activeAlbumCollector.cardQuantities[card.id] || 0;

                return (
                  <div
                    key={card.id}
                    className={`${styles.albumCardItem} ${
                      isOwned ? styles.albumCardOwned : styles.albumCardMissing
                    }`}
                  >
                    {isOwned ? (
                      <div className={styles.ownedTag}>
                        <CheckCircle2 size={10} style={{ display: "inline", marginRight: "3px" }} />
                        x{qty}
                      </div>
                    ) : (
                      <div className={styles.missingTag}>
                        <Lock size={10} style={{ display: "inline", marginRight: "3px" }} />
                        Sin descubrir
                      </div>
                    )}

                    <div className={styles.cardImageWrapper} style={{ height: "150px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={card.imageUrl}
                        alt={card.name}
                        className={styles.cardImage}
                        loading="lazy"
                      />
                    </div>
                    <div className={styles.cardInfo} style={{ padding: "8px" }}>
                      <div className={styles.cardName} style={{ fontSize: "0.82rem" }} title={card.name}>
                        <span>{card.emoji}</span>
                        <span>{card.name}</span>
                      </div>
                      <div className={styles.cardAnime} style={{ fontSize: "0.7rem" }}>
                        {card.anime}
                      </div>
                      <div
                        className={`${styles.cardBadge} ${getTierBadgeClass(card.tier)}`}
                        style={{ fontSize: "0.65rem", padding: "1px 4px" }}
                      >
                        {getTierName(card.tier)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
