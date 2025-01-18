const connection = require('../db');

const createCurrencyShopTable = `
  CREATE TABLE IF NOT EXISTS currency_shop (
    item_id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    name VARCHAR(32) NOT NULL,
    cost INT NOT NULL
  )
`;

connection.query(createCurrencyShopTable)
  .then(results => {
    console.log('Tabla "currency_shop" creada con éxito. (si no existía)');
  })
  .catch(err => {
    console.error('Error al crear la tabla:', err.message);
  });
