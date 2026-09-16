import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import FeatureStrip from "../components/FeatureStrip";
import GamesSection from "../components/GamesSection";
import EconomySection from "../components/EconomySection";
import Leaderboard from "../components/Leaderboard";
import Footer from "../components/Footer";
import { getVaultStats, getTopUsers } from "../lib/dataService";

export const revalidate = 60; // Revalidate live data every 60 seconds

export default async function Home() {
  const discordInviteCode = process.env.NEXT_PUBLIC_DISCORD_INVITE_CODE || "jA8tx5Vwe5";
  const discordUrl = `https://discord.gg/${discordInviteCode}`;

  // Fetch real stats from Supabase (or baseline community data if testing locally)
  const [vaultStats, topBalance, topLevel] = await Promise.all([
    getVaultStats(),
    getTopUsers("balance"),
    getTopUsers("level"),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--bg-base)" }}>
      {/* Navbar con balances de banco y casino discretos + botón discord compacto */}
      <Navbar serverUrl={discordUrl} vaultStats={vaultStats} />

      <main style={{ flex: 1 }}>
        {/* 1. Hero Principal */}
        <Hero discordUrl={discordUrl} />

        {/* 2. Barra horizontal de destacados full-width */}
        <FeatureStrip />

        {/* 3. Sección de juegos: 2 tarjetas (Hospedamos vs Jugamos) */}
        <GamesSection />

        {/* 4. Sección de economía & niveles con interfaz sin comandos y columnas horizontales */}
        <EconomySection stats={vaultStats} />

        {/* 5. Leaderboard (Hall of Fame) */}
        <Leaderboard topBalance={topBalance} topLevel={topLevel} />
      </main>

      <Footer />
    </div>
  );
}
