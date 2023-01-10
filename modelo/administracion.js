const db = require('../config/database');
const sql = require('mssql');
var os = require('os');
const database = require('../config/database');
const { Console } = require('console');
const nomenclatura = require('../config/nomenclatura');
const { passwordDigest } = require('soap');


module.exports.validartoken = function (token, id, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;

    sentencia = "SELECT *" +
        " FROM [SistemaAcademico].[seguridad].[token]" +
        "where [perid]=" + id + " and tokestado=1 and estadosesion=1 and" +
        " toktoken='" + token + "' ";

    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}


module.exports.obtenerpersonaubicacion = function (perid, idrol, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT * FROM  SistemaAcademico.seguridad.personaubicacion WHERE  (perid = " + perid + ") AND (idrol = " + idrol + ") ";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.obtenerpersonadadoid = function (perid, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT  per_id AS perId, per_nombres AS perNombres, per_apellidos AS perApellidos, per_email AS perEmail, per_cedula AS perCedula, per_estado AS perEstado FROM SistemaAcademico.seguridad.persona WHERE  (per_id = " + perid + ") ";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.obtenerrolesdadoid = function (idrol, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT rol_id AS rolId, rol_nombre AS rolNombre, rol_descripcion AS rolDescripcion, rol_estado AS rolEstado, rol_metodo AS rolMetodo, rol_icono AS rolIcono FROM SistemaAcademico.seguridad.roles  WHERE (rol_id =  " + idrol + ") ";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.obtenerpersonaroldadoidpersona = function (perid, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT per_id, rol_id, prol_estado AS prolEstado, prol_dependencia AS prolDependencia  FROM  SistemaAcademico.seguridad.personarol  WHERE  (per_id = " + perid + ")";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.obtenerrolesdadopadreyusuario = function (padre, perid, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT seguridad.rolopcion.rol_id, seguridad.rolopcion.pado_id, seguridad.rolopcion.opc_id, seguridad.rolopcion.rolop_estado, seguridad.rolopcion.rolop_insertar, seguridad.rolopcion.rolop_modificar, seguridad.rolopcion.rolop_eliminar, seguridad.opciones.opc_nombre, seguridad.opciones.opc_descripcion, seguridad.opciones.opc_url, seguridad.opciones.opc_metodo, seguridad.opciones.opc_estado,seguridad.opciones.opc_icono FROM   SistemaAcademico.seguridad.rolopcion INNER JOIN  SistemaAcademico.seguridad.opciones ON seguridad.rolopcion.opc_id = seguridad.opciones.opc_id WHERE (seguridad.rolopcion.pado_id = " + padre + ") AND (seguridad.rolopcion.rolop_estado = 1) AND (seguridad.rolopcion.rol_id = " + perid + ")";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.Listarpadreopciondadorol = function (rol, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT DISTINCT seguridad.padreopcion.pado_id, seguridad.padreopcion.pado_nombre, seguridad.padreopcion.pado_estado, seguridad.padreopcion.pado_icono, seguridad.rolopcion.rol_id FROM  seguridad.padreopcion INNER JOIN seguridad.rolopcion ON seguridad.padreopcion.pado_id = seguridad.rolopcion.pado_id  WHERE (seguridad.rolopcion.rol_id = " + rol + ") AND (seguridad.padreopcion.pado_estado = 1)   ORDER BY seguridad.padreopcion.pado_id";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

