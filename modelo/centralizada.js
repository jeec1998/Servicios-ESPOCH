const db = require('../config/databasecentral');
//const { Client } = require('pg')
const sql = require('pg');
var os = require('os');
const { Console } = require('console');
const { Client } = require('pg')

////servicio utilizado para el proceso de admisiones
module.exports.obtenerpersonapersonalizado = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", dir.prq_id as idprqdireccion, (select prq_nombre from central.parroquia where prq_id=dir.prq_id) as parroquiadireccion, nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, p.per_conyuge, p.per_idconyuge, admision "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
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
module.exports.obtenerpersonadatoscompletos = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, d.pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, " +
        "(select case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end) as datosprocedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
        + " WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            callback(null, false);
            console.log(cedula)
            console.error('Fallo en la Consulta método obtenerpersonadatoscompletos:', err.stack);
            client.end()
        })
}

module.exports.obtenerpersonareportematriculados = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, d.pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) "
        + " else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end as procedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
        + " WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            callback(null, false);
            console.log(cedula)
            console.error('Fallo en la Consulta método obtenerpersonareportematriculados:', err.stack);
            client.end()
        })
}

module.exports.obtenerpersonareportematriculadosPersonalizado = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, d.pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, " +
        " (select case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end) as procedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
        + " WHERE d.pid_valor= '" + cedula + "'  "
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            callback(null, false);
            console.log(cedula)
            console.error('Fallo en la Consulta método obtenerpersonareportematriculados:', err.stack);
            client.end()
        })
}

module.exports.obtenerpersonadadoid = function (perid, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, d.pid_valor, d.tdi_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, " +
        "(select case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end) as datosprocedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
        + " WHERE p.per_id= '" + perid + "'  "
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

module.exports.obtenerpersonadadoemail = function (email, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, d.pid_valor, d.tdi_id, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, " +
        "(select case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end) as datosprocedencia, p.per_conyuge, p.per_idconyuge "
        + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
        + " WHERE p.per_email= '" + email + "'"
    //+ " WHERE p.per_email= '" + email + "' or p.\"per_emailAlternativo\"='" + email + "'"
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

module.exports.obtenerdatospersonaincluidodiscapacidad = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\"," +
        "p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre," +
        "p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", dir.prq_id as idprqdireccion, " +
        "(select prq_nombre from central.parroquia where prq_id=dir.prq_id) as parroquiadireccion, nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, " +
        "p.per_procedencia, p.per_conyuge, p.per_idconyuge,  cd.cdi_id as idcarnetdiscapacidad, cd.cdi_numero as numerocarnetdiscapacidad, dc.dis_id as iddiscapacidad, dc.dis_valor as porcentajediscapacidad, td.tdi_id as idtipodiscapacidad, td.tdi_nombre as tipodiscapacidad, org.org_id, org.org_nombre, p.admision " +
        " FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id " +
        "LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id " +
        "LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id " +
        "LEFT JOIN central.\"carnetDiscapacidad\" cd on cd.per_id=p.per_id " +
        "LEFT JOIN central.discapacidad dc on dc.cdi_id=cd.cdi_id " +
        "LEFT JOIN central.\"tipoDiscapacidad\" td on td.tdi_id=dc.tdi_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id " +
        "LEFT JOIN central.organizacion org on org.org_id = cd.org_id " +
        "INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id " +
        " WHERE d.pid_valor= '" + cedula + "'  "
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
module.exports.obtenerpersonadadonombresyfechanacimientodinardap = function (nombres, fechaNacimiento, callback) {
    var client = new Client(db)
    var sentencia;
    /////modificar para devolver datos completos
    sentencia = "SELECT * FROM central.persona p WHERE trim(concat(p.\"per_primerApellido\",' ',p.\"per_segundoApellido\",' ',p.per_nombres))='" + nombres + "' and p.\"per_fechaNacimiento\"= '" + fechaNacimiento + "' "
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
    sentencia = "SELECT * FROM central." + nombretabla + " t WHERE t." + nombrecampo + " ilike '%" + nombre + "%' "
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
module.exports.obtenerregistrodadonombre = function (nombretabla, nombrecampo, nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"" + nombretabla + "\" t WHERE t." + nombrecampo + " ilike '" + nombre + "'"
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
    sentencia = "SELECT * FROM central.\"" + nombretabla + "\" t WHERE t." + nombrecampo + "=" + nombre + ""
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
module.exports.obtenerinstruccionformaldadoidpersonaynumregistro = function (idpersona, numregistro, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"instruccionFormal\" i WHERE i.per_id = " + idpersona + " and i.ifo_registro='" + numregistro + "'"
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
module.exports.obtenertituloacademicodadoidinstitucionytitulo = function (idinstitucion, idtitulo, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"tituloAcademico\" ta WHERE ta.tit_id = " + idtitulo + " and ta.ins_id=" + idinstitucion + ""
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
    sentencia = "INSERT INTO central.persona (per_nombres, \"per_primerApellido\", \"per_segundoApellido\", per_email,\"per_emailAlternativo\", \"per_fechaNacimiento\", tsa_id, etn_id, eci_id, gen_id, \"per_creadoPor\", \"per_fechaCreacion\", \"per_modificadoPor\", \"per_fechaModificacion\", lugarprocedencia_id,sex_id, per_procedencia, per_conyuge, per_idconyuge, admision, \"per_telefonoCelular\", \"per_telefonoCasa\") "
        + "VALUES('" + objPersona.per_nombres + "', '" + objPersona.per_primerapellido + "' , '" + objPersona.per_segundoapellido + "', '" + objPersona.per_email + "','" + objPersona.per_emailAlternativo + "', '" + objPersona.per_fechanacimiento + "', " + objPersona.tsa_id + "," + objPersona.etn_id + "," + objPersona.eci_id + "," + objPersona.gen_id + "," + objPersona.per_creadopor + ",'" + objPersona.per_fechacreacion + "'," + objPersona.per_modificadopor + ",'" + objPersona.per_fechamodificacion + "'," + objPersona.lugarprocedencia_id + "," + objPersona.sex_id + ",'" + objPersona.per_procedencia + "','" + objPersona.per_conyuge + "','" + objPersona.per_idconyuge + "','" + objPersona.admision + "','','');";
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

module.exports.ingresoDocumentoPersonalGenerico = function (valor, idtipodoc, idpersona, estado, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"documentoPersonal\" (pid_valor, tdi_id, per_id, pid_activo) "
        + "VALUES('" + valor + "', '" + idtipodoc + "', '" + idpersona + "', '" + estado + "');";
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
module.exports.ingresocarnetDiscapacidad = function (numconadis, idorganizacion, idpersona, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"carnetDiscapacidad\" (\"cdi_numero\", org_id, per_id, cdi_habilitado) "
        + "VALUES('" + numconadis + "', '" + idorganizacion + "', '" + idpersona + "', 'true');";
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
module.exports.ingresoDiscapacidad = function (porcentajediscapacidad, idtipodiscapacidad, idcarnetdiscapacidad, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"discapacidad\" (dis_valor, tdi_id, cad_id, cdi_id, mdi_id, dis_observacion) "
        + "VALUES('" + porcentajediscapacidad + "', '" + idtipodiscapacidad + "','1','" + idcarnetdiscapacidad + "', '1','REGISTRO DESDE INFODIGITAL');";
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
///////ACTUALIZAR PERSONA EN LA CENTRALIZADA
module.exports.modificardatospersona = function (emailinst, email, telefonocelular, telefonocasa, idlugarnacimiento, idgenero, idpersona, fechamodificacion, idetnia, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_email\"='" + emailinst + "',\"per_emailAlternativo\"='" + email + "', \"per_telefonoCelular\"='" + telefonocelular + "', \"per_fechaModificacion\"='" + fechamodificacion + "', \"per_telefonoCasa\"='" + telefonocasa + "' WHERE per_id=" + idpersona + ""
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

/////ACTUALIZAR PERSONA ADMISION CON LOS DATOS DEL SENESCYT
module.exports.modificardatospersonaadmision = function (idgenero, idestadocivil, fechamodificacion, idetnia, idpersona, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_fechaModificacion\"='" + fechamodificacion + "', \"etn_id\"='" + idetnia + "', \"eci_id\"='" + idestadocivil + "', \"gen_id\"='" + idgenero + "', \"admision\"='true' WHERE per_id=" + idpersona + ""
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
///////ACTUALIZAR PERSONA EN LA CENTRALIZADA
module.exports.modificarpersonacondatosmatriz = function (objpersonamatriz, idpersonacentral, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_nombres\"='" + objpersonamatriz.per_nombres + "', \"per_primerApellido\"='" + objpersonamatriz.per_primerapellido + "', \"per_segundoApellido\"='" + objpersonamatriz.per_segundoapellido + "', \"per_fechaNacimiento\"='" + objpersonamatriz.per_fechanacimiento + "', \"etn_id\"='" + objpersonamatriz.etn_id + "', \"eci_id\"='" + objpersonamatriz.eci_id + "', \"gen_id\"='" + objpersonamatriz.gen_id + "', \"per_fechaModificacion\"='" + objpersonamatriz.per_fechamodificacion + "', \"lugarprocedencia_id\"='" + objpersonamatriz.lugarprocedencia_id + "', \"sex_id\"='" + objpersonamatriz.sex_id + "', \"per_procedencia\"='" + objpersonamatriz.per_procedencia + "', \"admision\"='" + objpersonamatriz.admision + "' WHERE per_id=" + idpersonacentral + ""
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
//ACTUALIZACION PERSONALIZADA
module.exports.modificarpersona = function (objpersonamatriz, idpersonacentral, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_nombres\"='" + objpersonamatriz.per_nombres + "', \"per_primerApellido\"='" + objpersonamatriz.per_primerapellido + "', \"per_segundoApellido\"='" + objpersonamatriz.per_segundoapellido + "', \"per_fechaNacimiento\"='" + objpersonamatriz.per_fechanacimiento + "', \"per_email\"='" + objpersonamatriz.per_email + "', \"per_emailAlternativo\"='" + objpersonamatriz.per_emailAlternativo + "', \"per_telefonoOficina\"='" + objpersonamatriz.per_telefonoOficina + "', \"per_telefonoCelular\"='" + objpersonamatriz.per_telefonoCelular + "', \"etn_id\"='" + objpersonamatriz.etn_id + "', \"eci_id\"='" + objpersonamatriz.eci_id + "', \"gen_id\"='" + objpersonamatriz.gen_id + "', \"per_fechaModificacion\"='" + objpersonamatriz.per_fechamodificacion + "', \"lugarprocedencia_id\"='" + objpersonamatriz.lugarprocedencia_id + "', \"sex_id\"='" + objpersonamatriz.sex_id + "', \"per_procedencia\"='" + objpersonamatriz.per_procedencia + "', \"admision\"='" + objpersonamatriz.admision + "' WHERE per_id=" + idpersonacentral + ""
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
module.exports.actualizarpersonaprocedencia = function (objpersonamatriz, idpersonacentral, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_nombres\"='" + objpersonamatriz.per_nombres + "', \"per_primerApellido\"='" + objpersonamatriz.per_primerapellido + "', \"per_segundoApellido\"='" + objpersonamatriz.per_segundoapellido + "', \"per_fechaNacimiento\"='" + objpersonamatriz.per_fechanacimiento + "', \"eci_id\"='" + objpersonamatriz.eci_id + "', \"per_fechaModificacion\"='" + objpersonamatriz.per_fechamodificacion + "', \"lugarprocedencia_id\"='" + objpersonamatriz.lugarprocedencia_id + "', \"sex_id\"='" + objpersonamatriz.sex_id + "', \"per_procedencia\"='" + objpersonamatriz.per_procedencia + "' WHERE per_id=" + idpersonacentral + ""
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

module.exports.modificarnacionalidadpersonalizado = function (idnacionalidad, reqvisa, idpersona, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "SELECT * FROM central.\"nacionalidadPersona\" WHERE per_id=" + idpersona + ""
        client.connect()
        client.query(sentencia)
            .then(response => {
                if (response.rowCount > 0) {
                    sentencia = "UPDATE central.\"nacionalidadPersona\" SET nac_id=" + idnacionalidad + " WHERE per_id=" + idpersona + ""
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
                        + "VALUES('true', '" + reqvisa + "' , '" + idpersona + "','" + idnacionalidad + "', 'true');";
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
///////ACTUALIZAR LA DIRECCION DE LA PERSONA EN LA CENTRALIZADA
module.exports.modificardireccionpersona = function (calleprincipal, idpersona, idparroquia, callback) {
    try {
        console.log(calleprincipal, idpersona, idparroquia)
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
                    sentencia = "INSERT INTO central.\"direccion\" (\"dir_callePrincipal\", \"dir_activa\", per_id, prq_id) "
                        + "VALUES( '" + calleprincipal + "' ,'true', '" + idpersona + "', '" + idparroquia + "')";
                    client.query(sentencia)
                        .then(response => {
                            callback(null, true);
                            client.end()
                        })
                        .catch(err => {
                            console.error('Fallo en la Consulta Crear direccion persona', err.stack);
                            callback(null, false);
                            client.end()
                        })
                }

            })
            .catch(err => {
                console.error('Fallo en la Consulta modificar direccion persona', err.stack);
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
module.exports.ingresoInstruccionFormal = function (idpersona, idtituloacademico, ifo_tiempo, ifo_registro, ifo_fecharegistro, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"instruccionFormal\" (ifo_registro, ifo_tiempo,\"ifo_unidadTiempo\",\"ifo_fechaRegistro\", per_id, tac_id) "
        + "VALUES('" + ifo_registro + "', '" + ifo_tiempo + "', 'AÑOS' , '" + ifo_fecharegistro + "', '" + idpersona + "', '" + idtituloacademico + "');";
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
module.exports.ingresoTituloAcademico = function (idtitulo, idinstitucion, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"tituloAcademico\" (tit_id,ins_id) "
        + "VALUES('" + idtitulo + "', '" + idinstitucion + "');";
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
module.exports.ingresoinstitucion = function (institucionnombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"institucion\" (ins_nombre,ciu_id) "
        + "VALUES('" + institucionnombre + "', '1');";
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
module.exports.ingresotitulo = function (titulonombre, nivelacademico, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"titulo\" (tit_nombre,naa_id) "
        + "VALUES('" + titulonombre + "', '" + nivelacademico + "');";
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

module.exports.ingresosexo = function (valor, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"sexo\" (sex_nombre) "
        + "VALUES('" + valor + "');";
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

module.exports.ingresotablacon2campos = function (nombretabla, campo1, campo2, valor1, valor2, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "INSERT INTO central.\"" + nombretabla + "\" (\"" + campo1 + "\",\"" + campo2 + "\") "
        + "VALUES('" + valor1 + "', '" + valor2 + "');";
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
module.exports.obtenerregistroempiezaconunvalor = function (nombretabla, nombrecampo, nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.\"" + nombretabla + "\" t WHERE t.\"" + nombrecampo + "\" ilike '" + nombre + "%' "
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

module.exports.obtenerpaisdadonombre = function (nombre, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT * FROM central.pais WHERE pai_nombre ilike '%" + nombre + "%'"
    client.connect()
    client.query(sentencia)
        .then(response => {
            callback(null, response.rows);
            client.end()
        })
        .catch(err => {
            console.error('Fallo en la Consulta', err.stack);
            callback(null, null);
            client.end()
        })
}

module.exports.actualizardiscapacidad = function (porcentaje, tipodiscapacidad, idcarnet, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = " UPDATE central.discapacidad SET dis_valor='" + porcentaje + "', tdi_id='" + tipodiscapacidad + "' WHERE cdi_id=" + idcarnet + "";
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

module.exports.actualizarCarnetDiscapacidad = function (objcarnetregistrado, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = " UPDATE central.\"carnetDiscapacidad\" SET cdi_numero='" + objcarnetregistrado.cdi_numero + "', org_id='" + objcarnetregistrado.org_id + "', cdi_habilitado='" + objcarnetregistrado.cdi_habilitado + "' WHERE cdi_id=" + objcarnetregistrado.cdi_id + "";
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

module.exports.modificarnombrespersona = function (primerapellido, segundoapellido, nombrecompleto, idpersona, callback) {
    try {
        var client = new Client(db)
        var sentencia;
        sentencia = "UPDATE central.persona SET \"per_primerApellido\"='" + primerapellido + "', \"per_segundoApellido\"='" + segundoapellido + "', \"per_nombres\"='" + nombrecompleto + "' WHERE per_id=" + idpersona + ""
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

module.exports.obtenerpersonadiscapacidad = function (cedula, callback) {
    var client = new Client(db)
    var sentencia;
    sentencia = "SELECT p.per_id, pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\"," +
        "p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.gen_id, gn.gen_nombre," +
        " p.sex_id, sex_nombre as sexo, p.per_procedencia, cd.cdi_id as idcarnetdiscapacidad, cd.cdi_numero as numerocarnetdiscapacidad, cd.cdi_habilitado as estadocarnet, dc.dis_id as iddiscapacidad, dc.dis_valor as porcentajediscapacidad, td.tdi_id as idtipodiscapacidad, td.tdi_nombre as tipodiscapacidad, org.org_id, org.org_nombre, p.admision " +
        " FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id " +
        "LEFT JOIN central.\"carnetDiscapacidad\" cd on cd.per_id=p.per_id " +
        "LEFT JOIN central.discapacidad dc on dc.cdi_id=cd.cdi_id " +
        "LEFT JOIN central.\"tipoDiscapacidad\" td on td.tdi_id=dc.tdi_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id " +
        "LEFT JOIN central.organizacion org on org.org_id = cd.org_id " +
        "INNER JOIN central.genero gn on p.gen_id=gn.gen_id " +
        " WHERE d.pid_valor= '" + cedula + "'  "
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
