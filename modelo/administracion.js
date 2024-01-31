const db = require('../config/database');
const sql = require('mssql');
var os = require('os');
const { Console } = require('console');
const { passwordDigest } = require('soap');
const baseMaster = require('../config/baseMaster');


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

module.exports.listacarrerasmaster = function (callback) {
    var conn = new sql.ConnectionPool(baseMaster);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT Carreras.strCodigo, Carreras.strBaseDatos, Carreras.strCodEstado, Escuelas.strNombre, Facultades.strNombre AS Facultad, Facultades.strCodigo as codigofacultad, Carreras.strNombre AS Carrera, strSede as Sede"
        + " FROM Carreras INNER JOIN Escuelas ON Carreras.strCodEscuela = Escuelas.strCodigo INNER JOIN Facultades ON Escuelas.strCodFacultad = Facultades.strCodigo ";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta método listacarrerasmaster: ', err.stack)
                    callback(err, null)
                } else {
                    callback(null, recordset.recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error método listacarrerasmaster: ' + err.stack);
            callback(err, null)
        });
}


module.exports.periodovigentemaster = function (callback) {
    var conn = new sql.ConnectionPool(baseMaster);
    var req = new sql.Request(conn);
    var sentencia;
    let now = new Date();
    let day = now.getDate()
    let month = now.getMonth() + 1
    let year = now.getFullYear()
    var fecha = "";
    if (month < 10) {
        month = "0" + month
    }
    if (day < 10) {
        day = "0" + day
    }
    fecha = year + "-" + month + "-" + day
    sentencia = "SELECT * FROM dbo.[Periodos] WHERE  convert(datetime,'" + fecha + "T00:00:00.000" + "') BETWEEN [dtFechaInic] AND [dtFechaFin]";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta método periodovigentemaster: ', err.stack)
                    callback(err, null)
                } else {
                    callback(null, recordset.recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error método periodovigentemaster: ' + err.stack);
            callback(err, null)
        });
}


module.exports.ObtenerMatriculasdadocarrerayperiodo = function (carrera, facultad, basedatos, periodo, callback) {
    var conex = db;
    conex.database = basedatos;
    var conn = new sql.ConnectionPool(conex);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "select  sintCodigo, strCodPeriodo, strCodEstud, strCedula, strNacionalidad, strCodNivel, strAutorizadaPor, dtFechaAutorizada,"
        + " strCreadaPor, dtFechaCreada, strCodEstado, cast ('" + carrera + "' as varchar(150)) as Carrera,"
        + " cast ('" + facultad + "' as varchar(150)) as Facultad  from [" + basedatos + "].[dbo].matriculas "
        + " inner join [" + basedatos + "].[dbo].Estudiantes on matriculas.strCodEstud=Estudiantes.strCodigo where (strCodPeriodo = '" + periodo + "') and strCodEstado='DEF'"
    try {
        conn
            .connect()
            .then(() => {
                req.query(sentencia, (err, recordset) => {
                    if (err) {
                        console.error("Fallo en la Consulta método ObtenerMatriculasdadocarrerayperiodo: ", err.stack);
                        conn.close();
                        callback(null, null);
                    } else {
                        conn.close();
                        callback(null, recordset);
                    }
                });
            })
            .catch((err) => {
                console.log("ObtenerMatriculadadocarrerayperiodo: " + err.stack);
                conn.close();
                callback(null, null);
            });
    } catch (error) {
        conn.close();
        callback(null, null);
    }
};




