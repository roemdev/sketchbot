const { Events } = require("discord.js");
const chalk = require("chalk");
const boxen = require("boxen");
const figlet = require("figlet");
const ora = require("ora");
const pkg = require("../package.json");

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.clear();

    /*
     * MATRIX RAIN (FAKE BUT EPIC)
     */
    const matrixChars = "01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < 12; i++) {
      let line = "";
      for (let j = 0; j < 80; j++) {
        line += matrixChars[Math.floor(Math.random() * matrixChars.length)];
      }
      console.log(chalk.green(line));
      await sleep(35);
    }

    console.clear();

    /*
     * SPINNER DE CONEXIÓN
     */
    const spinner = ora({
      text: chalk.cyan("Establishing secure connection to Discord Gateway"),
      spinner: "dots12",
    }).start();

    await sleep(1200);
    spinner.text = chalk.cyan("Authenticating bot token");
    await sleep(900);
    spinner.text = chalk.cyan("Decrypting session payload");
    await sleep(900);
    spinner.succeed(chalk.green("Connection established"));

    await sleep(400);
    console.clear();

    /*
     * ASCII PRINCIPAL
     */
    console.log(
      chalk.hex("#00ffff")(
        figlet.textSync("SKETCHBOT", {
          font: "ANSI Shadow",
          horizontalLayout: "full",
        })
      )
    );

    /*
     * DEPENDENCIAS
     */
    const deps = pkg.dependencies || {};
    const depBlock =
      chalk.hex("#00ffff")("▸ Dependencies:\n") +
      chalk.white(`  • discord.js : ${deps["discord.js"] || "N/A"}\n`) +
      chalk.white(`  • chalk      : ${deps["chalk"] || "N/A"}\n`) +
      chalk.white(`  • ora        : ${deps["ora"] || "N/A"}\n`) +
      chalk.white(`  • boxen      : ${deps["boxen"] || "N/A"}`);

    /*
     * CAJA NEON (ESTÁTICA)
     */
    const statusBox = boxen(
      chalk.hex("#39ff14").bold(">> SYSTEM STATUS: ONLINE <<") +
      "\n\n" +
      chalk.hex("#00ffff")("▸ Bot Identity : ") +
      chalk.white(client.user.tag) +
      "\n" +
      chalk.hex("#00ffff")("▸ Runtime     : ") +
      chalk.white("Node.js " + process.version) +
      "\n" +
      chalk.hex("#00ffff")("▸ Mode        : ") +
      chalk.hex("#ff00ff").bold("NEON HACKER") +
      "\n" +
      chalk.hex("#00ffff")("▸ Access      : ") +
      chalk.greenBright("GRANTED") +
      "\n\n" +
      depBlock,
      {
        padding: 1,
        borderStyle: "double",
        borderColor: "cyan",
      }
    );

    console.log(statusBox);

    /*
     * MENSAJES FINALES
     */
    await sleep(300);
    console.log(chalk.hex("#ff00ff")("> Boot sequence completed."));
    await sleep(200);
    console.log(chalk.hex("#ff00ff")("> Listening for events..."));
    await sleep(200);
    console.log(chalk.hex("#ff00ff")("> All systems nominal."));
  },
};
