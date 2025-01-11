const {
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  PermissionFlagsBits
} = require("discord.js");
const assets = require("../../assets.json");

module.exports = {
  name: "pr",
  description: "Envía el menú para elegir los ping roles",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      const deny = new EmbedBuilder()
        .setColor(assets.color.base)
        .setDescription(`${assets.emoji.deny} No puedes ejecutar este comando.`)
      return message.reply({ embeds: [deny], allowedMentions: { repliedUser: false } });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId("roles")
      .setPlaceholder("Elije las notificaciones aquí")
      .setMinValues(1)
      .setMaxValues(3)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Anuncios")
          .setValue("1289201648312385547")
          .setDescription("Cambios, novedades y anuncios importantes.")
          .setEmoji("🔔"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Eventos")
          .setValue("1286300145310236745")
          .setDescription("Sorteos, Torneos, Concursos, etc.")
          .setEmoji("🗓️"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Juegos gratis")
          .setValue("1286300137936912405")
          .setDescription("Epic Games, Steam, GOG, etc.")
          .setEmoji("🎁")
      );

    const embed = new EmbedBuilder()
      .setColor(assets.color.base)
      .setAuthor({
        name: message.client.user.username,
        iconURL: message.client.user.displayAvatarURL({ dynamic: true }),
      })
      .setTitle("Roles de Notificaciones")
      .setThumbnail(
        message.client.user.displayAvatarURL({ dynamic: true, size: 1024 })
      )
      .setDescription(
        "En nuestra comunidad, evitamos el uso de los pings @everyone y @here para mantener un ambiente más tranquilo. Por lo que te recomendamos que elijas las notificaciones que desees recibir para no perderte de algo que realmente te interese. ¡Hazlo aquí debajo!"
      )
      .addFields({
        name: "Opciones:",
        value:
          `🔔 — **Anuncios**: Cambios, novedades y anuncios importantes.\n` +
          `🗓️ — **Eventos**: Sorteos, Torneos, Concursos, etc.\n` +
          `🎁 — **Juegos gratis**: Epic Games, Steam, GOG, etc.`,
      });

    const row = new ActionRowBuilder().addComponents(select);

    // Enviar el mensaje con el embed y el menú
    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    // Eliminar el mensaje del comando
    message.delete();

    // Crear el collector para permitir que cualquier miembro del servidor pueda interactuar
    const filter = (i) => i.customId === "roles";
    const collector = msg.createMessageComponentCollector({
      filter,
    });

    collector.on("collect", async (i) => {
      const rolesToAssign = i.values;
      const member = message.guild.members.cache.get(i.user.id);

      const roleObjects = rolesToAssign.map((roleId) =>
        message.guild.roles.cache.get(roleId)
      );

      const existingRoles = roleObjects.filter((role) =>
        member.roles.cache.has(role.id)
      );

      if (existingRoles.length > 0) {
        const embed = new EmbedBuilder()
          .setColor(assets.color.yellow)
          .setDescription(
            `${assets.emoji.warn} <@${
              i.user.id
            }>: Ya tienes estos roles: ${existingRoles
              .map((role) => role.toString())
              .join(", ")}`
          );

        return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      // Asignar los roles seleccionados que el usuario no tiene
      try {
        await member.roles.add(roleObjects);
        const embed = new EmbedBuilder()
          .setColor(assets.color.green)
          .setDescription(
            `${assets.emoji.check} <@${
              i.user.id
            }>: Te asigné los roles: ${roleObjects
              .map((role) => role.toString())
              .join(", ")}`
          );

        return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error(error);
        const embed = new EmbedBuilder()
          .setColor(assets.color.red)
          .setDescription(
            `${assets.emoji.deny} <@${i.user.id}>: Hubo un error al asignar los roles`
          );

        return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    });
  },
};
