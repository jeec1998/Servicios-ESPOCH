const db = require('../config/databasecentral');
//const { Client } = require('pg')
const sql = require('pg')
var os = require('os');
const { Console } = require('console');
const { Client } = require('pg')

module.exports.obtenerdocumento = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    /////modificar para devolver datos completos
    sentencia = "SELECT p.per_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoOficina\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", \"per_afiliacionIESS\", tsa_id, etn_id,  p.eci_id, gen_id, p.\"per_creadoPor\", p.\"per_fechaCreacion\", p.\"per_modificadoPor\",   p.\"per_fechaModificacion\", p.\"per_telefonoCasa\", p.lugarprocedencia_id,p.sex_id, p.per_procedencia FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}

module.exports.obtenerdocumentopormail = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoOficina\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", \"per_afiliacionIESS\", tsa_id, etn_id,  p.eci_id, gen_id, p.\"per_creadoPor\", p.\"per_fechaCreacion\", p.\"per_modificadoPor\",   p.\"per_fechaModificacion\", p.\"per_telefonoCasa\", p.lugarprocedencia_id,     p.sex_id, p.per_procedencia FROM central.persona p WHERE p.per_email= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}
module.exports.obtenerdocumentoporperid = function (idpersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.persona p WHERE p.per_id= " + idpersona + "  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}

module.exports.obtenerestadocivildadonombre = function (nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"estadoCivil\" e WHERE e.eci_nombre like '%" + nombre + "%' "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}

module.exports.obtenerdiasdeconfiguracion = function (callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT c.valor FROM central.configuracion c WHERE c.nombre = 'diasactualizacion'"
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}

module.exports.listacamposactualizar = function (callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.camposactualizar c"
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })


}

module.exports.actualizarpersona = function (nombretabla, campocentralizada, valor, idpersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = " UPDATE central." + nombretabla + " SET \"" + campocentralizada + "\"='" + valor + "' WHERE per_id=" + idpersona + "";
    //console.log(sentencia)
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })
}
