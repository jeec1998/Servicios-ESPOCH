const db = require('../config/databasecentral');
//const { Client } = require('pg')
const sql = require('pg');
var os = require('os');
const { Console } = require('console');
const { Client } = require('pg')

module.exports.obtenerpersonapersonalizado = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, p.per_procedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id "
        + " WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            callback(null, false);
            console.error('Fallo en la Consulta', err.stack);
            client.end()
        })
}

module.exports.obtenerdocumento = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT d.pid_valor, p.* FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

module.exports.obtenerpersonadadonombresapellidosyfechanacimiento = function (nombres, apellido1, apellido2, fechaNacimiento, callback) {
    var client = new Client(db)
    var sentencia;
    /////modificar para devolver datos completos
    sentencia = "SELECT * FROM central.persona p WHERE p.per_nombres= '" + nombres + "' and p.\"per_primerApellido\"= '" + apellido1 + "' and p.\"per_segundoApellido\"= '" + apellido2 + "' and p.\"per_fechaNacimiento\"= '" + fechaNacimiento + "' "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
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
            callback(null, false);
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
            callback(null, false);
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
            callback(null, false);
            client.end()
        })


}

module.exports.obtenersexodadonombre = function (nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"sexo\" s WHERE s.sex_nombre like '%" + nombre + "%' "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })


}

module.exports.obtenerdatosdadonombredelatablayelcampo = function (nombretabla, nombrecampo, nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central." + nombretabla + " t WHERE t." + nombrecampo + " like '%" + nombre + "%' "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })


}

module.exports.obtenerdatosdadonombredelatablayelcampoparainteger = function (nombretabla, nombrecampo, nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central." + nombretabla + " t WHERE t." + nombrecampo + "=" + nombre + ""
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
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
            callback(null, false);
            client.end()
        })


}

module.exports.obtenerregistrosportabla = function (nombretabla, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"" + nombretabla + "\""
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
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
            callback(null, false);
            client.end()
        })


}

module.exports.actualizarpersona = function (nombretabla, campocentralizada, valor, idpersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = " UPDATE central." + nombretabla + " SET \"" + campocentralizada + "\"='" + valor + "' WHERE per_id=" + idpersona + "";
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

module.exports.ingresoPersonaCentralizada = function (objPersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.persona (per_nombres, \"per_primerApellido\", \"per_segundoApellido\", \"per_fechaNacimiento\", tsa_id, etn_id, eci_id, gen_id, \"per_creadoPor\", \"per_fechaCreacion\", \"per_modificadoPor\", \"per_fechaModificacion\", lugarprocedencia_id,sex_id, per_procedencia, per_conyuge, per_idconyuge) "
        + "VALUES('" + objPersona.per_nombres + "', '" + objPersona.per_primerapellido + "' , '" + objPersona.per_segundoapellido + "', '" + objPersona.per_fechanacimiento + "', " + objPersona.tsa_id + "," + objPersona.etn_id + "," + objPersona.eci_id + "," + objPersona.gen_id + "," + objPersona.per_creadopor + ",'" + objPersona.per_fechacreacion + "'," + objPersona.per_modificadopor + ",'" + objPersona.per_fechamodificacion + "'," + objPersona.lugarprocedencia_id + "," + objPersona.sex_id + ",'" + objPersona.per_procedencia + "','" + objPersona.per_conyuge + "','" + objPersona.per_idconyuge + "');";
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

module.exports.ingresoDocumentoPersonal = function (cedula, idpersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"documentoPersonal\" (pid_valor, tdi_id, per_id, pid_activo) "
        + "VALUES('" + cedula + "', '1' , '" + idpersona + "', 'true');";
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

module.exports.ingresoDireccionPersona = function (idpersona, calleprincipal, numcasa, idparroquia, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"direccion\" (\"dir_callePrincipal\", dir_numero, dir_activa, prq_id, per_id) "
        + "VALUES('" + calleprincipal + "', '" + numcasa + "', 'true' , '" + idparroquia + "', '" + idpersona + "');";
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

module.exports.ingresoNacionalidad = function (idpersona, tienevisa, idnacionalidad, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"nacionalidadPersona\" (\"npe_esNacimiento\", \"npe_tieneVisaTrabajo\", per_id, nac_id, npe_default) "
        + "VALUES('true', '" + tienevisa + "' , '" + idpersona + "','" + idnacionalidad + "', 'true');";
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, true);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, false);
            client.end()
        })
}

/*
module.exports.actualizarcuentacentral = function (usuario, pw, saltillo, callback) {
    var client = new Client(db)
    client.connect()
    client.query(" UPDATE central.cuenta SET cta_password='" + pw + "', \"cta_CodigoSalt\"='" + saltillo + "' WHERE cta_login='" + usuario + "';")
        .then(response => {
            client.end()
            callback(null, response.rowCount);
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            client.end()
            callback(null, 0);
        })
}
*/



///////ACTUALIZAR PERSONA EN LA CENTRALIZADA
module.exports.modificardatospersona = function (email, telefonocelular, telefonocasa, idlugarnacimiento, idgenero, idpersona, fechamodificacion, idetnia, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_emailAlternativo\"='" + email + "', \"per_telefonoCelular\"='" + telefonocelular + "', gen_id=" + idgenero + ", \"per_fechaModificacion\"='" + fechamodificacion + "', \"per_telefonoCasa\"='" + telefonocasa + "', lugarprocedencia_id=" + idlugarnacimiento + ",etn_id=" + idetnia + " WHERE per_id=" + idpersona + ""
        client.connect()
        client.query(sentencia)
            .then(response => {
                client.end()
                callback(null, true);
            })
            .catch(err => {
                console.error('Fallo en la Consulta modificar persona', err.stack);
                client.end()
                callback(null, false);
            })
    }
    catch (error) {
        reject(error);
        callback(null, 0);
    }
}

///////ACTUALIZAR LA DIRECCION DE LA PERSONA EN LA CENTRALIZADA
module.exports.modificardireccionpersona = function (calleprincipal, idpersona, idparroquia, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "SELECT * FROM central.\"direccion\" WHERE per_id=" + idpersona + ""
        client.connect()
        client.query(sentencia)
            .then(response => {
                if (response.rowCount > 0) {
                    sentencia = "UPDATE central.direccion SET \"dir_callePrincipal\"='" + calleprincipal + "', \"prq_id\"=" + idparroquia + " WHERE per_id=" + idpersona + ""
                    client.query(sentencia)
                        .then(response => {
                            client.end()
                            callback(null, true);
                        })
                        .catch(err => {
                            console.error('Fallo en la Consulta modificar direccion', err.stack);
                            client.end()
                            callback(null, false);
                        })
                }
                else {
                    sentencia = "INSERT INTO central.\"direccion\" (\"dir_callePrincipal\", \"dir_activa\", per_id) "
                        + "VALUES( '" + calleprincipal + "' ,'true', '" + idpersona + "'";
                    client.query(sentencia)
                        .then(response => {
                            callback(null, true);
                            client.end()
                        })
                        .catch(err => {
                            console.error('Fallo en la Consulta Crear nacionalidad persona', err.stack);
                            callback(null, false);
                            client.end()
                        })
                }

            })
            .catch(err => {
                console.error('Fallo en la Consulta modificar nacionalidad persona', err.stack);
                client.end()
                callback(null, false);
            })
    }
    catch (error) {
        reject(error);
        callback(null, 0);
    }
}

///////ACTUALIZAR LA NACIONALIDAD DE LA PERSONA EN LA CENTRALIZADA
module.exports.modificarnacionalidadpersona = function (nacionalidad, idpersona, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "SELECT * FROM central.\"nacionalidadPersona\" WHERE per_id=" + idpersona + ""
        client.connect()
        client.query(sentencia)
            .then(response => {
                if (response.rowCount > 0) {
                    sentencia = "UPDATE central.\"nacionalidadPersona\" SET nac_id=" + nacionalidad.nac_id + " WHERE per_id=" + idpersona + ""
                    client.query(sentencia)
                        .then(response => {
                            client.end()
                            callback(null, true);
                        })
                        .catch(err => {
                            console.error('Fallo en la Consulta modificar nacionalidad', err.stack);
                            client.end()
                            callback(null, false);
                        })
                }
                else {
                    sentencia = "INSERT INTO central.\"nacionalidadPersona\" (\"npe_esNacimiento\", \"npe_tieneVisaTrabajo\", per_id, nac_id, npe_default) "
                        + "VALUES('true', '" + nacionalidad.nac_requiereVisaTrabajo + "' , '" + idpersona + "','" + nacionalidad.nac_id + "', 'true');";
                    client.query(sentencia)
                        .then(response => {
                            callback(null, true);
                            client.end()
                        })
                        .catch(err => {
                            console.error('Fallo en la Consulta Crear nacionalidad persona', err.stack);
                            callback(null, false);
                            client.end()
                        })
                }

            })
            .catch(err => {
                console.error('Fallo en la Consulta modificar nacionalidad persona', err.stack);
                client.end()
                callback(null, false);
            })
    }
    catch (error) {
        reject(error);
        callback(null, 0);
    }
}

