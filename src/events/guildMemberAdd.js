const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const assets = require("../../config/assets.json");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const isBot = member.user.bot;
    const userRole = member.guild.roles.cache.get("1215767915329228890");
    const botRole = member.guild.roles.cache.get("1291149296921743372");

    // Asignar rol según el tipo de miembro
    if (isBot && botRole) {
      await member.roles.add(botRole).catch(console.error);
      return; // Si es bot, termina la ejecución aquí
    } else if (userRole) {
      await member.roles.add(userRole).catch(console.error);
    }

    // Enviar mensaje de bienvenida privado
    try {
      const welcomeMessage = 
        "¡Hola, bienvenido a Arkania! Nos alegra tenerte por aquí. Tenemos sitemas de economía, trivia, niveles y música para añadirle un extra de dinamismo a tu estancia. ¡Diviértete y pásalo bien!\n\n" +
        "> -# No olvides leer <#1128136414379397200>."


      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel("Enviado desde el servidor: Arkania")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
          .setCustomId("sent_from_arkania")
      );

      await member.send({ content: welcomeMessage, components: [row] });
    } catch (error) {
      console.error(
        `No se pudo enviar el mensaje al usuario ${member.user.tag}: ${error.message}`
      );
    }

    // Enviar mensaje de bienvenida al canal del servidor
    const user = member.user;
    const guild = member.guild;
    const discordJoinDate = `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`;
    const iconURL = guild.iconURL({ dynamic: true, size: 1024 });

    const embed = new EmbedBuilder()
      .setAuthor({ name: `¡Bievenido ${user.username}, contigo somos ${guild.memberCount} miembros!`, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .setColor(assets.color.base)

    member.guild.systemChannel.send({
      content: `**${user.username}** (<@${user.id}>) se unió al servidor`,
      embeds: [embed],
    });
  },
};