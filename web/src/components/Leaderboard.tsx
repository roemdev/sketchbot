"use client";

import React, { useState, useEffect } from "react";
import { Search, Trophy, Zap, Database, SearchX, Loader2 } from "lucide-react";
import { UserStat } from "../lib/types";
import { getTopUsers } from "../lib/dataService";
import styles from "./Leaderboard.module.css";

interface LeaderboardProps {
  topBalance: UserStat[];
  topLevel: UserStat[];
}

export default function Leaderboard({ topBalance, topLevel }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<"balance" | "level">("balance");
  const [searchQuery, setSearchQuery] = useState("");
  const [liveList, setLiveList] = useState<UserStat[]>([]);
  const [loading, setLoading] = useState(false);

  // Lista inicial desde SSR
  const initialList = activeTab === "balance" ? topBalance : topLevel;

  useEffect(() => {
    let isCancelled = false;

    if (!searchQuery || searchQuery.trim().length === 0) {
      setLiveList(initialList);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const results = await getTopUsers(activeTab, searchQuery, 50);
      if (!isCancelled) {
        setLiveList(results);
        setLoading(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, activeTab, initialList]);

  const isSearching = searchQuery.trim().length > 0;
  const displayList = isSearching ? liveList : (liveList.length > 0 ? liveList : initialList);
  const topThree = isSearching ? [] : displayList.slice(0, 3);
  const remainingList = isSearching ? displayList : displayList.slice(3, 5);

  const formatMoney = (val: number) => {
    return "$" + new Intl.NumberFormat("en-US").format(val);
  };

  return (
    <section className={styles.section} id="leaderboard">
      <div className="container">
        <h2 className="section-title">
          Hall of Fame <span>ARKANIA</span>
        </h2>
        <p className="section-subtitle">
          Ranking oficial en tiempo real de los miembros de la comunidad en Discord.
        </p>

        {/* CONTROLS */}
        <div className={styles.controlsRow}>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tabBtn} ${activeTab === "balance" ? styles.tabActiveGreen : ""}`}
              onClick={() => {
                setActiveTab("balance");
                setSearchQuery("");
              }}
              id="tab-balance"
            >
              <Trophy size={16} />
              <span>Top Fortuna</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "level" ? styles.tabActiveViolet : ""}`}
              onClick={() => {
                setActiveTab("level");
                setSearchQuery("");
              }}
              id="tab-level"
            >
              <Zap size={16} />
              <span>Top Nivel & XP</span>
            </button>
          </div>

          <div className={styles.searchBox}>
            {loading ? (
              <Loader2 size={16} color="var(--color-primary)" className="spin" style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Search size={16} color="var(--color-primary)" />
            )}
            <input
              type="text"
              placeholder="Buscar cualquier usuario en la DB..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              id="leaderboard-search"
            />
          </div>
        </div>

        {/* SI LA BASE DE DATOS DE SUPABASE ESTÁ VACÍA O SIN CREDENCIALES */}
        {initialList.length === 0 && searchQuery.trim().length === 0 ? (
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "40px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Database size={32} color="var(--color-primary)" />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
              Conexión en Tiempo Real con Discord & Supabase
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", maxWidth: "600px", lineHeight: "1.6" }}>
              El Hall of Fame se sincroniza en vivo con la tabla <code>user_stats</code> de tu base de datos de Supabase.
            </p>
          </div>
        ) : displayList.length === 0 && !loading ? (
          /* BUSQUEDA SIN RESULTADOS EN TODA LA DB */
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "14px",
              padding: "36px 24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <SearchX size={28} color="var(--text-muted)" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
              No se encontró a ningún miembro con "{searchQuery}" en la base de datos
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
              Prueba buscar con otro nombre de usuario de Discord.
            </p>
          </div>
        ) : (
          <>
            {/* TOP 3 PODIUM */}
            {topThree.length > 0 && (
              <div className={styles.podiumGrid}>
                {topThree.map((user, idx) => (
                  <div
                    key={user.discord_id}
                    className={`${styles.podiumCard} ${idx === 0 ? styles.firstPodiumCard : ""}`}
                  >
                    <div className={`${styles.rankBadge} ${idx === 0 ? styles.rankBadgeGold : ""}`}>
                      {user.rank ? (user.rank === 1 ? "👑 CHAMPION #1" : `#${user.rank} PODIUM`) : (idx === 0 ? "👑 CHAMPION #1" : `#${idx + 1} PODIUM`)}
                    </div>

                    <div className={`${styles.avatar} ${idx === 0 ? styles.firstAvatar : ""}`}>
                      {user.username.slice(0, 2).toUpperCase()}
                    </div>

                    <div className={styles.userName}>{user.username}</div>
                    <div className={styles.userProfession}>
                      {user.profession ? user.profession : `Jugador Nivel ${user.level}`}
                    </div>

                    {activeTab === "balance" ? (
                      <>
                        <div className={styles.mainStatGreen}>{formatMoney(user.balance)}</div>
                        <div className={styles.subStat}>Nivel {user.level} • {user.xp} XP</div>
                      </>
                    ) : (
                      <>
                        <div className={styles.mainStatViolet}>Nivel {user.level}</div>
                        <div className={styles.subStat}>{formatMoney(user.balance)} • {user.xp} XP</div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TABLA RESTO DE POSICIONES */}
            {remainingList.length > 0 && (
              <div className={styles.tableCard}>
                <table className={styles.leaderboardTable}>
                  <thead>
                    <tr>
                      <th>POSICIÓN</th>
                      <th>JUGADOR</th>
                      <th>NIVEL</th>
                      <th style={{ textAlign: "right" }}>BALANCE TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remainingList.map((user, idx) => (
                      <tr key={user.discord_id}>
                        <td style={{ color: "var(--color-cyan)", fontWeight: 700 }}>
                          #{user.rank ?? (idx + (isSearching ? 1 : 4))}
                        </td>
                        <td style={{ fontWeight: 700, color: "#ffffff" }}>{user.username}</td>
                        <td style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                          Nv. {user.level}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            color: "var(--color-gold)",
                          }}
                        >
                          {formatMoney(user.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
