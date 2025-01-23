const assets = require("../../assets.json");

module.exports = {
  pray: {
    taskType: "pray",
    successMessage: (earnings) =>
      `${assets.emoji.check} ¡Rezaste tan fuerte que alguien te escuchó! 🙏 Has ganado **🔸${earnings.toLocaleString()}** créditos!`,
    cooldownMessage: (nextTime) =>
      `${assets.emoji.deny} Todavía no puedes rezar. Podrás intentarlo de nuevo: <t:${nextTime}:R>.`,
  },
  work: {
    taskType: "work",
    successMessage: (earnings) =>
      `${assets.emoji.check} ¡Trabajaste arduamente y te pagaron! 💼 Has ganado **🔸${earnings.toLocaleString()}** créditos!`,
    cooldownMessage: (nextTime) =>
      `${assets.emoji.deny} Todavía no puedes trabajar. Podrás intentarlo de nuevo: <t:${nextTime}:R>.`,
  },
  hunt: {
    taskType: "hunt",
    successMessage: (earnings) =>
      `${assets.emoji.check} ¡Saliste de cacería y fue un éxito! 🦌 Has ganado **🔸${earnings.toLocaleString()}** créditos!`,
    cooldownMessage: (nextTime) =>
      `${assets.emoji.deny} Todavía no puedes cazar. Podrás intentarlo de nuevo: <t:${nextTime}:R>.`,
  },
  fish: {
    taskType: "fish",
    successMessage: (earnings) =>
      `${assets.emoji.check} ¡Tu paciencia pescando dio frutos! 🎣 Has ganado **🔸${earnings.toLocaleString()}** créditos!`,
    cooldownMessage: (nextTime) =>
      `${assets.emoji.deny} Todavía no puedes pescar. Podrás intentarlo de nuevo: <t:${nextTime}:R>.`,
  },
  mine: {
    taskType: "mine",
    successMessage: (earnings) =>
      `${assets.emoji.check} ¡En la mina conseguite minerales extraños! ⛏️ Has ganado **🔸${earnings.toLocaleString()}** créditos!`,
    cooldownMessage: (nextTime) =>
      `${assets.emoji.deny} Todavía no puedes minar. Podrás intentarlo de nuevo: <t:${nextTime}:R>.`,
  },
};
