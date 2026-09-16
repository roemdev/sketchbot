export interface UserStat {
  discord_id: string;
  username: string;
  balance: number;
  level: number;
  xp: number;
  avatar_url?: string;
  profession?: string;
  rank?: number;
}

export interface CollectorProfile extends UserStat {
  ownedCardKeys: string[];
  cardsCount: number;
  tier4Count: number;
  completionPct: number;
  totalPossible: number;
  cardQuantities: Record<string, number>;
}

export interface VaultStats {
  bankBalance: number;
  casinoBalance: number;
  totalCirculating: number;
  totalUsers: number;
  isLive: boolean;
  lastUpdated: string;
}

export type CommandCategory = "all" | "economy" | "games" | "daily" | "levels" | "utility";

export interface BotCommand {
  name: string;
  description: string;
  category: CommandCategory;
  usage: string;
  cooldown?: string;
  highlight?: boolean;
}

export interface GameServer {
  id: string;
  name: string;
  genre: string;
  ip: string;
  port: string;
  version: string;
  status: "online" | "offline" | "maintenance";
  badge: string;
  description: string;
  image?: string;
  highlights?: string[];
  icon?: string;
}
