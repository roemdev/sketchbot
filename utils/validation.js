/**
 * Valida si un nickname de Minecraft es válido.
 * Los nicknames de Minecraft deben tener entre 3 y 16 caracteres
 * y solo pueden contener letras, números y guiones bajos.
 *
 * @param {string} nick - El nickname a validar.
 * @returns {boolean} - True si es válido, false de lo contrario.
 */
function isValidMinecraftNick(nick) {
  const regex = /^[a-zA-Z0-9_]{3,16}$/;
  return regex.test(nick);
}

module.exports = {
  isValidMinecraftNick
};
