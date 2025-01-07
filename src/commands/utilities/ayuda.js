const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");
const assets = require("../../../assets.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ayuda")
    .setDescription(
      "Muestra un menú de ayuda con información sobre los comandos."
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    // Crear el menú de selección
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ayuda_menu")
      .setPlaceholder("Selecciona una guía")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Sistema de niveles")
          .setValue("xp")
          .setEmoji("⬆️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Economía")
          .setValue("economy")
          .setEmoji("🟡"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Bot de música")
          .setValue("music")
          .setEmoji("🎧"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Rol VIP")
          .setValue("vip")
          .setEmoji("⭐")
      );

    // Crear el embed inicial
    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({
        name: interaction.client.user.username,
        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("🆘 ¿Te perdiste? ¡No te preocupes!")
      .setDescription(
        "Aquí debajo podras leer todas las guías de las funciones en Arkania. ¡Dedícale un tiempo para no estar perdido y aprovechar todas las funciones de la comunidad!"
      )
      .addFields(
        {
          name: " ",
          value: "**Economía**: <:check:1313237490395648021>",
          inline: true,
        },
        {
          name: " ",
          value: "**Niveles**: <:check:1313237490395648021>",
          inline: true,
        },
        {
          name: " ",
          value: "**Música**: <:check:1313237490395648021>",
          inline: true,
        },
        {
          name: " ",
          value: "**Rol VIP**: <:check:1313237490395648021>",
          inline: true,
        }
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Enviar el embed inicial con el menú
    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    // Crear un collector para manejar interacciones
    const filter = (i) =>
      i.customId === "ayuda_menu" && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      let responseEmbed;

      // Configurar el embed de respuesta basado en la selección
      switch (i.values[0]) {
        case "xp":
          responseEmbed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle("⬆️ Sistema de Niveles")
            .setDescription(
              "El sistema de niveles en Arkania recompensa tu actividad y participación en el servidor. ¡Sigue leyendo para aprender cómo subir de nivel y obtener roles exclusivos!"
            )
            .addFields(
              {
                name: "🤔 ¿Cómo ganar experiencia?",
                value:
                  "1. Enviando mensajes de texto.\n2. Conectándote a los canales de voz mientras hablas con otros miembros.\n> No obtendrás experiencia si estás silenciado o estás solo en el canal (los bots no cuentan como compañía).",
                inline: true,
              },
              {
                name: "✨ Roles por nivel",
                value:
                  "* <@&1321665235505119357>\n* <@&1234893710588645426>\n* <@&1284145958149554309>\n* <@&1324225993384136704>\n* <@&1247699315908935680>.",
                inline: true,
              },
              {
                name: "Comandos útiles",
                value:
                  "* `/rank` - Para ver tu experiencia y progreso.\n* `/leaderboard` - Para ver los que han acumulado más experiencia.",
              },
              {
                name: " ",
                value:
                  "¡Y eso es todo! Ahora que conoces cómo funciona el sistema de niveles, participa, socializa y alcanza los niveles más altos para obtener los mejores beneficios en **Arkania**.",
              }
            );
          break;

        case "economy":
          responseEmbed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle("Economía de Arkania")
            .setDescription(
              "Las monedas son la moneda virtual oficial de Arkania. Puedes acumularlas participando en actividades y eventos dentro del servidor."
            )
            .addFields(
              {
                name: "🤔 ¿Cómo gano monedas?",
                value:
                  "* `$collect` - Reclama tu ingreso diario. ¡Recuerda hacerlo todos los días para maximizar tus ganancias!\n* `$work` - Trabaja cada 30 segundos para ganar monedas de forma segura y constante. Es perfecto para acumular monedas sin riesgos.\n* `$slut` y `$crime` - Métodos arriesgados pero más lucrativos.\n* `$rob <miembro>` - Intenta robar las monedas en efectivo de otros usuarios. Si fallas, podrías pagar una multa considerable.",
              },
              {
                name: "🤑 Comandos de economía general",
                value:
                  "* `$dep <cantidad o all>` - Deposita tus monedas en el banco.\n* `$with <cantidad o all>` - Retira tus monedas del banco.\n* `$give-money <miembro> <cantidad o all>` - Dona tus monedas a otro miembro.\n* `$bal` - Para ver tu *(o de otro usuario)* cantidad de monedas en efectivo y el banco.\n* `$lb` - Para ver los 10 más ricos del servidor.\n* `/item buy <item>` - Para comprar artículos en la tienda.",
              },
              {
                name: "🃏 Comandos del casino (apuestas)",
                value:
                  "* `$bj <apuesta>` - Para jugar blackjack.\n* `$roulette <apuesta> <espacio>` - Para jugar la ruleta.\n* `$rr <apuesta>` - Para jugar a la ruleta rusa (requiere de al menos 2 jugadores).",
              },
              {
                name: " ",
                value:
                  "¡Con esto ya estás listo para convertirte en un magnate virtual en **Arkania**!",
              }
            );
          break;

        case "music":
          responseEmbed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle("Comandos Bot de música")
            .setDescription(
              "El bot de música es <@411916947773587456>. Un bot de **únicamente** música. Puede reproducir canciones de las plataformas YouTube, Spotify, Deezer, Apple Music, y otras. A continuación, los comandos que siempre debes tener pendiente:"
            )
            .addFields({
              name: "🤔 ¿Cómo funciona?",
              value:
                "* `m!play` - Reproduce una canción por link o por término de búsqueda.\n* `m!skip` - Salta la canción actual.\n* `m!leave` - Hace al bot salir del canal de voz.\n* `m!shuffle` - Mezcla las canciones de la playlist en reproducción.\n* `m!undo` - Cancela la última acción realizada.",
            });
          break;

        case "vip":
          responseEmbed = new EmbedBuilder()
            .setColor(assets.color.base)
            .setTitle("⭐ VIP")
            .setDescription(
              "El rol <@&1303816942326648884> te ofrece una experiencia potenciada en Arkania y es el mejor uso de tus monedas. ¡Aquí te dejo toda la información que necesitas!"
            )
            .addFields(
              {
                name: "🤔 ¿Cómo lo adquiero?",
                value:
                  "1. En la tienda de monedas.\n2. Como regalo de otro miembro.\n3. Como premio en algún sorteo o evento.\n4.Boosteando el servidor.\nLo puedes encontrar en dos duraciones (7d, 15d).",
                inline: true,
              },
              {
                name: "✨ Beneficios",
                value:
                  "1. Un extra en el ingreso diario.\n2. Destacar tu nombre en la lista de conectados.\n3. El **doble** de entrada en los sorteos.\n4. Un **25%** extra de experiencia.\n5. Mover o desconectar miembros de los canales de voz.",
                inline: true,
              },
              {
                name: "🔮 Futuro",
                value:
                  "Constantemente evaluamos la posibilidad de añadir nuevos beneficios al rol, eso también suele aumentar el costo de monedas del mismo por lo que almacena bien tus monedas y ¡vuelve un VIP de Arkania!.",
              }
            );
          break;

        default:
          responseEmbed = new EmbedBuilder()
            .setColor("Red")
            .setTitle("Error")
            .setDescription("Ocurrió un error al procesar tu selección.");
          break;
      }

      // Responder con el embed seleccionado
      await i.reply({
        embeds: [responseEmbed],
        flags: MessageFlags.Ephemeral,
      });
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction.followUp({
          content: "El tiempo para seleccionar una categoría ha expirado.",
          flags: MessageFlags.Ephemeral,
        });
      }
    });
  },
};
