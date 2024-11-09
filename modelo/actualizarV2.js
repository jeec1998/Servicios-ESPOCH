const db = require('../config/databasecentral');
//const { Client } = require('pg')
const sql = require('pg');
var os = require('os');
const { Console } = require('console');
const { Client } = require('pg')

/* Servicio utilizado para la Discapacidad */
module.exports.obtenerdiscapacidad= function (callback) {
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
/* Export para traer los datos biometricos de la base de datos  */
module.exports.biometricos =function(cedula, callback){
    var client = new Cliente(db);
    var sentencia;
    sentencia = "Select imagen from central.\"personaImagen\""
                +"WHERE per_id='" + cedula + "' "
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
}
module.exports.discapacidad = function (cedula, callback) {
    var client = new Client(db);
    var sentencia;
    sentencia = "SELECT u.\"per_id\", u.\"pid_valor\", c.\"cdi_numero\", c.\"org_id\", o.\"org_nombre\", c.\"cdi_habilitado\", d.\"dis_valor\", t.\"tdi_nombre\", d.\"dis_grado\""
        + " FROM central.\"documentoPersonal\" u "
        + " JOIN central.\"carnetDiscapacidad\" c ON u.per_id = c.per_id JOIN central.\"discapacidad\" d ON c.cdi_id = d.cdi_id JOIN central.\"organizacion\" o ON c.org_id = o.org_id JOIN central.\"tipoDiscapacidad\" t ON d.tdi_id = t.tdi_id JOIN central.\"medidaDiscapacidad\" m ON d.mdi_id= m.mdi_id"
        + " WHERE u.tdi_id = 1 AND u.pid_valor= '" + cedula + "'  "
    
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
module.exports.actualizarPorcentajeDiscapacidad = function(carnet, porcentajeDiscapacidad, callback) {
    try {
        var client = new Client(db);
        var sentencia = "UPDATE central.discapacidad SET \"dis_valor\"='" + porcentajeDiscapacidad + "' WHERE cdi_numero=" + carnet;
        
        client.connect();

        client.query(sentencia)
            .then(response => {
                client.end();
                callback(null, true); 
            })
            .catch(err => {
                console.error('Fallo en la Consulta modificar Porcentaje de Discapacidad', err.stack);
                client.end();
                callback(err, false);
            });
    } catch (error) {
        console.error('Error en la función:', error);
        callback(error, 0);
    }
};
module.exports.obtenerPersonaPersonalizado = function (cedula,callback){
    var client = new Client(db);
    var sentencia;
    sentencia = "SELECT u.\"pid_valor\", u.\"per_id\" , i.\"ifo_fechaRegistro\", i.\"ifo_registro\", t.\"tit_id\", s.\"ins_nombre\", l.\"tit_nombre\", n.\"naa_nombre\", c.\"ciu_nombre\", r.\"pro_nombre\""
    +" FROM central.\"documentoPersonal\" u"
    +" JOIN central.\"persona\" p ON u.\"per_id\" = p.\"per_id\" JOIN central.\"instruccionFormal\" i ON i.\"per_id\" = p.\"per_id\" JOIN central.\"tituloAcademico\" t ON t.\"tac_id\" = i.\"tac_id\" JOIN central.\"institucion\" s ON t.\"ins_id\" = s.\"ins_id\" JOIN central.\"ciudad\" c ON c.\"ciu_id\" = s.\"ciu_id\" JOIN central.\"provincia\" r ON r.\"pro_id\" = c.\"pro_id\" JOIN central.\"titulo\" l ON l.\"tit_id\" = t.\"tit_id\" JOIN central.\"nivelAcademico\" n ON n.\"naa_id\" = l.\"naa_id\""
    +" WHERE n.\"naa_id\" = 2  AND u.\"pid_valor\"= '" + cedula + "'  "
    
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
}
/* ****************************+ */