"use client";

import React, { useState } from "react";
import { Terminal, Search, Copy, Check, Clock, Sparkles } from "lucide-react";
import { BOT_COMMANDS } from "../lib/commandsData";
import { CommandCategory } from "../lib/types";
import styles from "./CommandExplorer.module.css";

export default function CommandExplorer() {
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const categories: { key: CommandCategory; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "economy", label: "💰 Economía" },
    { key: "games", label: "🎰 Casino & Juegos" },
    { key: "daily", label: "🎁 Recompensas" },
    { key: "levels", label: "🏆 Niveles & XP" },
    { key: "utility", label: "🛠️ Utilidad" },
  ];

  const filteredCommands = BOT_COMMANDS.filter((cmd) => {
    const matchesCategory = selectedCategory === "all" || cmd.category === selectedCategory;
    const matchesSearch =
      cmd.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCopy = (commandName: string) => {
    navigator.clipboard.writeText(commandName);
    setCopiedCmd(commandName);
    setTimeout(() => {
      setCopiedCmd(null);
    }, 2000);
  };

  return (
    <section className={styles.section} id="comandos">
      <div className="container">
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div className="badge badge-purple" style={{ marginBottom: "12px" }}>
            <Terminal size={13} />
            <span>Slash Commands v14</span>
          </div>
          <h2 className="section-title">Directorio de Comandos</h2>
          <p className="section-subtitle">
            Explora las capacidades completas de SketchBot. Comandos optimizados para autocompletado y botones interactivos en Discord.
          </p>
        </div>

        {/* FILTERS */}
        <div className={styles.filterRow}>
          <div className={styles.categoryGroup}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                className={`${styles.categoryBtn} ${
                  selectedCategory === cat.key ? styles.categoryActive : ""
                }`}
                onClick={() => setSelectedCategory(cat.key)}
                id={`cmd-filter-${cat.key}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className={styles.searchBox}>
            <Search size={16} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Buscar comando o función..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              id="cmd-search-input"
            />
          </div>
        </div>

        {/* COMMANDS GRID */}
        <div className={styles.commandsGrid}>
          {filteredCommands.map((cmd) => {
            const isCopied = copiedCmd === cmd.name;
            return (
              <div key={cmd.name} className={`glass-card ${styles.commandCard}`}>
                <div>
                  <div className={styles.cardHeader}>
                    <div className={styles.commandName}>
                      <span>{cmd.name}</span>
                      {cmd.highlight && (
                        <Sparkles size={14} style={{ color: "#fbbf24" }} />
                      )}
                    </div>
                    <button
                      className={`${styles.copyBtn} ${isCopied ? styles.copied : ""}`}
                      onClick={() => handleCopy(cmd.name)}
                      title="Copiar comando"
                      aria-label={`Copiar comando ${cmd.name}`}
                      id={`copy-${cmd.name.replace("/", "")}`}
                    >
                      {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>

                  <p className={styles.commandDesc} style={{ marginTop: "10px" }}>
                    {cmd.description}
                  </p>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.usageCode}>{cmd.usage}</div>
                  {cmd.cooldown && (
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Clock size={12} />
                      <span>{cmd.cooldown}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
