import { supabase } from "./supabase";
import { UserStat, VaultStats, CollectorProfile } from "./types";
import rawCards from "../data/cards.json";

// Datos base de las arcas cuando no hay credenciales locales de Supabase configuradas
const BASELINE_VAULTS: VaultStats = {
  bankBalance: 18450000,
  casinoBalance: 9820500,
  totalCirculating: 54120000,
  totalUsers: 0,
  isLive: false,
  lastUpdated: new Date().toISOString(),
};

export async function getVaultStats(): Promise<VaultStats> {
  if (!supabase) {
    return BASELINE_VAULTS;
  }

  try {
    const { data: vaults, error } = await supabase
      .from("user_stats")
      .select("discord_id, balance")
      .in("discord_id", ["server_bank", "server_casino"]);

    if (error || !vaults || vaults.length === 0) {
      return BASELINE_VAULTS;
    }

    const bankRecord = vaults.find((v) => v.discord_id === "server_bank");
    const casinoRecord = vaults.find((v) => v.discord_id === "server_casino");

    const { count: userCount } = await supabase
      .from("user_stats")
      .select("discord_id", { count: "exact", head: true })
      .not("discord_id", "ilike", "%_bank")
      .not("discord_id", "in", "(server_bank,server_casino)");

    return {
      bankBalance: bankRecord?.balance ?? BASELINE_VAULTS.bankBalance,
      casinoBalance: casinoRecord?.balance ?? BASELINE_VAULTS.casinoBalance,
      totalCirculating: (bankRecord?.balance ?? 0) + (casinoRecord?.balance ?? 0),
      totalUsers: userCount ?? BASELINE_VAULTS.totalUsers,
      isLive: true,
      lastUpdated: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Error al consultar Supabase, usando datos base de ARKANIA:", err);
    return BASELINE_VAULTS;
  }
}

export async function getTopUsers(
  sortBy: "balance" | "level" = "balance",
  searchQuery?: string,
  limit = 50
): Promise<UserStat[]> {
  if (!supabase) {
    return [];
  }

  try {
    let query = supabase
      .from("user_stats")
      .select("discord_id, username, balance, level, xp, profession")
      .not("discord_id", "ilike", "%_bank")
      .not("discord_id", "in", "(server_bank,server_casino)");

    if (sortBy === "level") {
      query = query.order("level", { ascending: false }).order("xp", { ascending: false });
    } else {
      query = query.order("balance", { ascending: false });
    }

    // Traer todos los usuarios para calcular su posición real (rank)
    query = query.limit(1000);

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return [];
    }

    const mapped: UserStat[] = data.map((u, idx) => ({
      discord_id: u.discord_id,
      username: u.username || "Miembro",
      balance: u.balance || 0,
      level: u.level || 1,
      xp: u.xp || 0,
      profession: u.profession,
      rank: idx + 1,
    }));

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      return mapped.filter((u) => u.username.toLowerCase().includes(q)).slice(0, limit);
    }

    return mapped.slice(0, limit);
  } catch (err) {
    console.warn("Error al consultar leaderboard de Supabase:", err);
    return [];
  }
}

export async function getTopCollectors(totalCardsAvailable = 19): Promise<CollectorProfile[]> {
  if (!supabase) {
    return [];
  }

  try {
    // 1. Consultar usuarios principales
    const { data: usersData, error: usersError } = await supabase
      .from("user_stats")
      .select("discord_id, username, balance, level, xp, profession")
      .not("discord_id", "ilike", "%_bank")
      .not("discord_id", "in", "(server_bank,server_casino)")
      .order("level", { ascending: false })
      .limit(20);

    if (usersError || !usersData || usersData.length === 0) {
      return [];
    }

    const discordIds = usersData.map((u) => u.discord_id);

    // 2. Consultar la tabla real user_cards en Supabase
    const { data: cardsData, error: cardsError } = await supabase
      .from("user_cards")
      .select("discord_id, card_key, quantity")
      .in("discord_id", discordIds);

    const userCardsMap: Record<string, Record<string, number>> = {};
    if (cardsData && !cardsError) {
      cardsData.forEach((row) => {
        if (!userCardsMap[row.discord_id]) {
          userCardsMap[row.discord_id] = {};
        }
        userCardsMap[row.discord_id][row.card_key] = row.quantity;
      });
    }

    const rawCardsData: Record<string, any> = rawCards;

    const collectors: CollectorProfile[] = usersData.map((u) => {
      const cardQtyMap = userCardsMap[u.discord_id] || {};
      const ownedCardKeys = Object.keys(cardQtyMap).filter((k) => cardQtyMap[k] > 0);
      const cardsCount = ownedCardKeys.length;

      let tier4Count = 0;
      ownedCardKeys.forEach((key) => {
        if (rawCardsData[key] && rawCardsData[key].tier === 4) {
          tier4Count += 1;
        }
      });

      const completionPct = Math.round((cardsCount / totalCardsAvailable) * 100);

      return {
        discord_id: u.discord_id,
        username: u.username || "Miembro",
        balance: u.balance || 0,
        level: u.level || 1,
        xp: u.xp || 0,
        profession: u.profession,
        rank: 1,
        ownedCardKeys,
        cardsCount,
        tier4Count,
        completionPct,
        totalPossible: totalCardsAvailable,
        cardQuantities: cardQtyMap,
      };
    });

    // Ordenar coleccionistas por número de cartas distintas obtenidas, luego por legendarias
    collectors.sort((a, b) => b.cardsCount - a.cardsCount || b.tier4Count - a.tier4Count);
    collectors.forEach((c, index) => {
      c.rank = index + 1;
    });

    return collectors;
  } catch (err) {
    console.warn("Error al consultar coleccionistas en Supabase:", err);
    return [];
  }
}
