module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    console.log(`Bot listo! Conectado como ${client.user.tag}`);
  }
};
