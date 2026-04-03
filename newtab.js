const db = require("./services/dbService");

async function recrearTabla() {
  try {
    // Borra la tabla si existe
    await db.execute("DROP TABLE IF EXISTS store;");
    console.log("1. Tabla vieja eliminada.");

    // Crea la tabla con la estructura correcta
    await db.execute(`
      CREATE TABLE store (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price INTEGER NOT NULL DEFAULT 0,
          icon_id TEXT,
          minecraft_item TEXT,
          status TEXT DEFAULT 'available'
      );
    `);
    console.log(
      "2. Tabla nueva creada con éxito. Todas las columnas están listas.",
    );

    // Cierra el proceso para que la terminal no se quede colgada
    process.exit(0);
  } catch (error) {
    console.error("Hubo un error:", error);
    process.exit(1);
  }
}

recrearTabla();
