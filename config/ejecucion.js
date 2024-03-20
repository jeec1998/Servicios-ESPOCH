const sql = require('mssql');
const dbacademico = require("../config/baseMaster");

async function ejecutarConsultaSQL(carrera, sentencia) {
  let pool;

  try {

    var conex = dbacademico;
    conex.database = carrera;
    pool = await sql.connect(conex);

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const result = await transaction.request().query(sentencia);
      await transaction.commit();
      console.log(result)

      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    throw error;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function ejecutarConsultaSQLcontransacion(transaction, sqlQuery) {
  // console.log(transaction)
  return new Promise((resolve, reject) => {
    transaction.request().query(sqlQuery, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.recordset);
      }
    });
  });
}


module.exports = {
  ejecutarConsultaSQLcontransacion, ejecutarConsultaSQL
};
