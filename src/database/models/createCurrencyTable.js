const connection = require('../db');

const createCurrencyTable = `
  CREATE TABLE IF NOT EXISTS currency (
    user_id BIGINT PRIMARY KEY NOT NULL,
    balance INT DEFAULT 0 NOT NULL,
    membership ENUM('basic', 'vip') DEFAULT 'basic' NOT NULL
  )
`;

connection.query(createCurrencyTable)
  .then(results => {
    console.log('Tabla "currency" creada con éxito. (si no existía)');
  })
  .catch(err => {
    console.error('Error al crear la tabla:', err.message);
  });
