const connection = require('../db')

const createCurrencyShopTable = `
  create table if not exists currency_shop(
    item_id int auto_increment primary key not null,
    name varchar(32) not null,
    cost int not null
  )
`;

connection.query(createCurrencyShopTable, (err, results) => {
  if (err) {
    console.error('Error al crear la tabla:', err.message);
    return;
  }
  console.log('Tabla "currency_shop" creada con éxito. (si no existía)')
})