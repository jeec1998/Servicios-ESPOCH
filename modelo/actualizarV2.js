const db = require('../config/databasecentral');
//const { Client } = require('pg')
const sql = require('pg');
var os = require('os');
const { Console } = require('console');
const { Client } = require('pg')

/* Servicio utilizado para la Discapacidad */
module.exports.obtenerdiscapacidadpersonalizado = function (callback) {
    var client = new Client(db);
    var sentencia;
    sentencia = "SELECT u.\"per_id\", u.\"pid_valor\", c.\"cdi_numero\", c.\"org_id\", o.\"org_nombre\", c.\"cdi_habilitado\", d.\"dis_valor\", t.\"tdi_nombre\", d.\"dis_grado\""
        + " FROM central.\"documentoPersonal\" u "
        + " JOIN central.\"carnetDiscapacidad\" c ON u.per_id = c.per_id JOIN central.\"discapacidad\" d ON c.cdi_id = d.cdi_id JOIN central.\"organizacion\" o ON c.org_id = o.org_id JOIN central.\"tipoDiscapacidad\" t ON d.tdi_id = t.tdi_id JOIN central.\"medidaDiscapacidad\" m ON d.mdi_id= m.mdi_id"
        + " WHERE u.tdi_id = 1"
    
    client.connect();
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end();
        })
        .catch(err => {
            callback(null, false);
            console.error('Fallo en la Consulta', err.stack);
            client.end();
        });
};
/* ****************************+ */