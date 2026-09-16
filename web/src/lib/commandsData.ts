import { BotCommand } from "./types";

export const BOT_COMMANDS: BotCommand[] = [
  // DAILY
  {
    name: "/diario",
    description: "Reclama tu subsidio diario del Banco Central. Si el banco está en quiebra, la ayuda se congela.",
    category: "daily",
    usage: "/diario",
    cooldown: "24 horas",
    highlight: true,
  },
  {
    name: "/recompensas lista",
    description: "Consulta el catálogo de recompensas disponibles por racha y por roles del servidor.",
    category: "daily",
    usage: "/recompensas lista",
  },
  
  // ECONOMY
  {
    name: "/trabajo",
    description: "Completa una tarea laboral. Genera e inyecta entre $100,000 y $240,000 directamente a las arcas fiscales.",
    category: "economy",
    usage: "/trabajo",
    cooldown: "45 minutos",
    highlight: true,
  },
  {
    name: "/balance",
    description: "Consulta tu saldo en mano, fondos resguardados en tu banco y tu posición en el ranking.",
    category: "economy",
    usage: "/balance [usuario]",
  },
  {
    name: "/banco",
    description: "Panel financiero en vivo con la liquidez total, subsidios y solvencia del Banco del Servidor.",
    category: "economy",
    usage: "/banco",
    highlight: true,
  },
  {
    name: "/casino",
    description: "Visualiza la bóveda del casino, volumen de apuestas retenidas y el pozo acumulado de la casa.",
    category: "economy",
    usage: "/casino",
  },
  {
    name: "/depositar",
    description: "Guarda monedas en mano en tu cuenta bancaria protegida de robos y crímenes.",
    category: "economy",
    usage: "/depositar <cantidad | all>",
  },
  {
    name: "/retirar",
    description: "Retira fondos de tu cuenta bancaria para utilizarlos en apuestas, compras o transferencias.",
    category: "economy",
    usage: "/retirar <cantidad | all>",
  },
  {
    name: "/crimen",
    description: "Intenta cometer un robo o hackeo. Si tienes éxito obtienes botín; si fracasas, pagas una multa al banco.",
    category: "economy",
    usage: "/crimen <tipo>",
    cooldown: "2 horas",
  },
  {
    name: "/store",
    description: "Accede al catálogo de compras oficial del servidor: roles, boosts y ventajas exclusivas.",
    category: "economy",
    usage: "/store",
  },
  {
    name: "/swap",
    description: "Convierte tus monedas de SketchBot a créditos de servicio o plataformas integradas.",
    category: "economy",
    usage: "/swap <monto>",
  },

  // GAMES & CASINO
  {
    name: "/blackjack",
    description: "Juega al 21 clásico contra el crupier de la casa. Un 10% del premio neto nutre al Banco Central.",
    category: "games",
    usage: "/blackjack <apuesta>",
    cooldown: "10 seg",
    highlight: true,
  },
  {
    name: "/minas",
    description: "Desafía el campo de minas 3x3 interactivo. Cada diamante aumenta tu multiplicador.",
    category: "games",
    usage: "/minas <apuesta>",
    cooldown: "10 seg",
    highlight: true,
  },
  {
    name: "/torre",
    description: "Asciende piso por piso en la Torre de Riesgo. Decide cuándo cobrar o arriésgate a caer.",
    category: "games",
    usage: "/torre <apuesta>",
    cooldown: "10 seg",
  },
  {
    name: "/cara-cruz",
    description: "Duelo rápido al azar 50/50 contra la casa. Multiplica tu apuesta instantáneamente.",
    category: "games",
    usage: "/cara-cruz <apuesta> <lado>",
    cooldown: "10 seg",
  },
  {
    name: "/smash",
    description: "Crea y participa en salas de apuestas en tiempo real para partidas competitivas de Smash Bros.",
    category: "games",
    usage: "/smash crear <apuesta> <luchador>",
  },

  // LEVELS
  {
    name: "/nivel",
    description: "Despliega tu tarjeta visual de nivel, progreso de XP ganado en chat/voz y rango del servidor.",
    category: "levels",
    usage: "/nivel [usuario]",
    highlight: true,
  },
  {
    name: "/sync-roles",
    description: "Sincroniza y reclama automáticamente todos los roles asociados a tu nivel de experiencia.",
    category: "levels",
    usage: "/sync-roles",
  },
  {
    name: "/manage-xp",
    description: "Comando administrativo para asignar, reiniciar o calibrar XP de usuarios de la comunidad.",
    category: "levels",
    usage: "/manage-xp <usuario> <accion> <cantidad>",
  },

  // UTILITY
  {
    name: "/setup-voice",
    description: "Configura el canal generador de salas de voz temporales privadas y autogestionadas.",
    category: "utility",
    usage: "/setup-voice <canal>",
  },
  {
    name: "/setup-colors",
    description: "Despliega el menú interactivo para que los usuarios elijan el color de su nombre.",
    category: "utility",
    usage: "/setup-colors",
  },
  {
    name: "/ping",
    description: "Verifica el estado de salud, latencia WebSocket y tiempo de respuesta con la API de Discord.",
    category: "utility",
    usage: "/ping",
  },
];
