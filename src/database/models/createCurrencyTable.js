const connection = require('../db')

const createCurrencyTable = `
  create table if not exists currency(
    user_id int primary key not null,
    balance int default 0 not null,
    membership enum("basic", "vip") default "basic" not null
  )
`;

connection.query(createCurrencyTable, (err, results) => {
  if (err) {
    console.error('Error al crear la tabla:', err.message);
    return;
  }
  console.log('Tabla "currency" creada con éxito. (si no existía)')
})