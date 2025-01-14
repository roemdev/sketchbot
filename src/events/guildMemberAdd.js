const {
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const updateVoiceChannel = require("./updateVoiceChannel");


module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const isBot = member.user.bot;
    const userRole = member.guild.roles.cache.get("1215767915329228890");
    const botRole = member.guild.roles.cache.get("1291149296921743372");
    const voiceChannelId = "1327513515438772335";

    // Assign role based on member type
    if (isBot && botRole) {
      await member.roles.add(botRole).catch(console.error);
    } else if (userRole) {
      await member.roles.add(userRole).catch(console.error);
    }

    // Send private welcome message to the user
    try {
      const welcomeMessage = `¡Hola! 👋 Este es un breve mensaje para darte la bienvenida a la comunidad de Arkania. Nos emociona mucho tenerte aquí y que formes parte de nosotros.\n\nSi aun no lo has hecho, te invitamos a echarle un vistazo a <#1324197251882422327> para ponerte en marcha.\n\nPara ayudarnos a conocerte mejor, por favor tómate un momento de presentarte en <#1173781298721063014>. Si gustas, puedes usar la siguiente plantilla:\n\nNombre: [Tu nombre]\nPaís: [El país donde estás o donde naciste]\nInvitado por: [Quien te invitó a la comunidad o cómo accediste a ella]\nJuegos favoritos: [Tus juegos favoritos desde siempre o los actuales]\nExpectativa: [¿Qué esperas de la comunidad?]\n\nSiéntete libre de añadir toda la información que desees. ¡Buscamos conocerte!\n\n¡Esperamos que disfrutes siendo parte de la comunidad Arkania! 🥳`;

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

    await updateVoiceChannel(member.guild, voiceChannelId);
  },
};
