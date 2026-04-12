const { Events } = require('discord.js');
const { Ollama } = require('ollama');

// Configuración: Reemplaza con la IP de tu servidor Proxmox
const ollama = new Ollama({ host: 'http://10.0.0.72:11434' });

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // 1. Ignorar mensajes de otros bots para evitar bucles
        if (message.author.bot) return;

        // 2. Verificar si mencionaron a @sketchbot
        if (!message.mentions.has(message.client.user)) return;

        // 3. Limpiar la mención del texto (regex para detectar <@ID> o <@!ID>)
        const prompt = message.content.replace(/<@!?\d+>/g, '').trim();

        // Si solo lo mencionaron vacío, no responder
        if (!prompt) return;

        try {
            // Indicar visualmente que el bot está procesando la respuesta
            await message.channel.sendTyping();

            // Llamada a la API de Ollama en Proxmox
            const response = await ollama.chat({
                model: 'phi4-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente conciso y directo. Responde siempre de forma breve (máximo 2 o 3 oraciones), sin introducciones largas ni rellenos innecesarios. Usa un tono natural y amigable.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                // Ajustes de generación para mayor control
                options: {
                    num_predict: 250, // Límite de tokens para evitar respuestas muy largas
                    temperature: 0.7  // Nivel de creatividad equilibrado
                }
            });

            // Enviar la respuesta como respuesta al mensaje original
            if (response.message.content) {
                await message.reply(response.message.content);
            }

        } catch (error) {
            console.error('Error al conectar con Ollama en Proxmox:', error);

            // Notificar el error de forma amigable
            await message.reply('Lo siento, mi conexión con el servidor de inteligencia artificial falló.');
        }
    },
};