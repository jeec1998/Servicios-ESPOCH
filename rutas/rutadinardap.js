const express = require('express');
const router = express.Router();
const soap = require('soap');
const jwt_decode = require('jwt-decode');
const UrlAcademico = require('../config/urlAcademico');
const pathimage = require('path')
const nomenclatura = require('../config/nomenclatura');
const { Console } = require('console');
const urlAcademico = require('../config/urlAcademico');
const centralizada = require('../modelo/centralizada');
const e = require('express');

router.get('/obtenerpersona/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        let listado = [];
        var tipo = 1;
        var persona = await new Promise(resolve => { centralizada.obtenerdocumento(cedula, (err, valor) => { resolve(valor); }) });
        if (persona.length > 0) {
            var numerodias = 0;
            var Resultado = await new Promise(resolve => { centralizada.obtenerdiasdeconfiguracion((err, valor) => { resolve(valor); }) });
            if (Resultado != null) {
                var numerodias = Resultado[0].valor;
            }
            var fechasistema = "";
            fechasistema = persona[0].per_fechaModificacion;
            var listafecha = persona[0].per_fechaModificacion.toString().split(".")[0]
            let fechaactual = new Date();
            let resta = fechaactual.getTime() - fechasistema.getTime();
            var resultadoresta = Math.round(resta / (1000 * 60 * 60 * 24));
            var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
            if ((resultadoresta > numerodias) && (numerodias != 0)) {
                if (!persona[0].admision) {
                    var listadinardap = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                    if (listadinardap != null) {
                        personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                        if (personapersonalizada != null) {
                            if (personapersonalizada.length > 0) {
                                listado.push(personapersonalizada[0]);
                                console.log('Datos de la persona actualizados en la centralizada')
                            }
                        }
                    }
                    else {
                        listado.push(personapersonalizada[0]);
                        console.log('Datos de la persona no actualizados en la centralizada')
                    }
                }
                else {
                    listado.push(personapersonalizada[0]);
                    console.log('Datos de la persona no actualizados en la centralizada')
                }
            }
            else {
                if (personapersonalizada != null) {
                    if (personapersonalizada.length > 0) {
                        listado.push(personapersonalizada[0]);
                        console.log('Persona devuelta de la centralizada')
                    }
                }
            }
            return res.json({
                success: true,
                listado: listado
            });
        }
        else {
            if (cedula.length == 10) {
                tipo = 2;
                var registrar = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                if (registrar != null) {
                    var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                    if (personapersonalizada != null) {
                        if (personapersonalizada.length > 0) {
                            return res.json({
                                success: true,
                                listado: personapersonalizada[0]
                            });
                        }
                    }
                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No se ha encontrado información en la Dinardap'
                    });
                }
            }
            else {
                return res.json({
                    success: false,
                    mensaje: 'Cédula incorrecta'
                });
            }
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/buscarRegistros/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var listado = [];
        var nombres = "";
        var fechaNacimiento = "";
        var url = UrlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaq;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.getFichaGeneral(args, async function (err, result) {
                    if (err) {
                        console.log('Error: ' + err)
                        callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listacamposdinardap = objjson.instituciones[0].datosPrincipales.registros;
                        for (campos of listacamposdinardap) {
                            listado.push(campos);
                        }
                        for (atr of listado) {
                            if (atr.campo == "nombre") {
                                nombres = atr.valor;
                            }
                            if (atr.campo == "fechaNacimiento") {
                                fechaNacimiento = atr.valor;
                            }
                        }
                        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonadadonombresyfechanacimientodinardap(nombres, fechaNacimiento, (err, valor) => { resolve(valor); }) });
                        if ((personacentralizada != null) || (personacentralizada.length > 0)) {
                            return res.json({
                                success: true,
                                listado: personacentralizada
                            });
                        }
                        else {
                            return res.json({
                                success: false,
                                mensaje: 'No existen registros en la base de datos'
                            });
                        }
                    }
                });
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/procesonombres/:nombre', async (req, res) => {
    const nombrepersona = req.params.nombre;
    try {
        let personacentralizada = {};
        var nombrescompletos = "";
        var primerApellido = "";
        var segundoApellido = "";
        const nombres = nombrepersona.split(" ");
        var pospalabra = [];
        var cont = 0;
        var contpalabracorta = false;
        if (nombres.length > 0) {
            for (var i = 0; i < nombres.length; i++) {
                if (nombres[i].length <= 3) {
                    contpalabracorta = true
                    pospalabra[cont] = nombres[i] + ' ' + nombres[i + 1]
                    i = i + 1
                }
                else {
                    pospalabra[cont] = nombres[i];
                }
                cont = cont + 1;
            }
            console.log(pospalabra)
            if (pospalabra.length < 4) {
                if (contpalabracorta) {
                    primerApellido = pospalabra[0]
                    segundoApellido = ''
                    for (var c = 1; c < pospalabra.length; c++) {
                        console.log(pospalabra[c])
                        nombrescompletos = nombrescompletos + pospalabra[c] + ' '
                    }
                }
                else {
                    if (pospalabra.length == 2) {
                        primerApellido = pospalabra[0]
                        segundoApellido = ''
                        nombrescompletos = pospalabra[1]
                    } else {
                        primerApellido = pospalabra[0]
                        segundoApellido = pospalabra[1]
                        nombrescompletos = pospalabra[2]
                    }
                }
            }
            else {
                primerApellido = pospalabra[0]
                segundoApellido = pospalabra[1]
                for (var c = 2; c < pospalabra.length; c++) {
                    nombrescompletos = nombrescompletos + pospalabra[c] + ' '
                }
            }
            personacentralizada = {
                per_primerapellido: primerApellido,
                per_segundoapellido: segundoApellido,
                per_nombres: nombrescompletos
            }
            console.log('Apellidos y nombres: ' + personacentralizada)
            return res.json({
                success: true,
                nombrePersona: personacentralizada
            });
            /*nombrescompletos = "";
            primerApellido = nombres[0];
            segundoApellido = nombres[1];
            for (var i = 2; i < nombres.length; i++) {
                nombrescompletos = nombrescompletos + nombres[i] + " ";
            }*/
        }
    }
    catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/verificarinstruccionformal/:idpersona', async (req, res) => {
    const idpersona = req.params.idpersona;
    try {
        var instruccionformal = await new Promise(resolve => { verificarinstruccionformalpersona(idpersona, (err, valor) => { resolve(valor); }) });
        if (instruccionformal != null) {
            return res.json({
                success: true,
                mensaje: 'Datos de Instruccion formal de la persona almacenados en la base de datos',
                listado: instruccionformal
            });
        }
        else {
            return res.json({
                success: false,
                mensaje: 'Error con los datos de Instruccion formal de la persona',
                listado: []
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
//////FUNCIONES
async function actualizarcamposportipo(idtipo, campocentralizada, tablacentralizada, valor, objpersona, callback) {
    try {
        var actualizado = false;
        let lst = [];
        switch (idtipo) {
            case 1:  // busca el id de estado civil en la centralizada y actualiza el registro de persona
                var estadocivil = await new Promise(resolve => { centralizada.obtenerestadocivildadonombre(valor, (err, valor) => { resolve(valor); }) });
                if (estadocivil.length > 0) {
                    actualizado = true;
                    var idestadocivil = estadocivil[0].eci_id;
                    if (idestadocivil != objpersona.eci_id) {
                        var actualizacion = centralizada.actualizarpersona(tablacentralizada, campocentralizada, idestadocivil, objpersona.per_id, function (Result) { });
                        if (actualizacion) {
                            console.log('Estado Civil actualizado correctamente')
                        }
                    }
                    else {
                        console.log('El estado civil no necesita modificacion')
                    }
                }
                //lst.push(objpersona);
                break;
            case 2:   // separa la cadena de nombres para los parámetros de la centralizada
                let listaparametros = [];
                const nombres = valor.split(" ");
                if (nombres.length > 0) {
                    var primerApellido = nombres[0];
                    listaparametros.push(primerApellido);
                    var segundoApellido = nombres[1];
                    listaparametros.push(segundoApellido);
                    var nombrescompletos = "";
                    for (var i = 2; i < nombres.length; i++) {
                        nombrescompletos = nombrescompletos + nombres[i] + " ";
                    }
                    listaparametros.push(nombrescompletos);
                    const camposcentralizadalst = campocentralizada.split(",");
                    if (camposcentralizadalst.length > 0) {
                        var cont = 0;
                        for (var i = 0; i < camposcentralizadalst.length; i++) {
                            //var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona(tablacentralizada, camposcentralizadalst[i], listaparametros[i], objpersona.per_id, (err, valor) => { resolve(valor); }) });
                            var actualizacion = centralizada.actualizarpersona(tablacentralizada, camposcentralizadalst[i], listaparametros[i], objpersona.per_id, function (Result) { });
                            //console.log('Resultado actualizacion en la centralizada: '+actualizacion)
                            if (actualizacion) {
                                cont = cont + 1;
                            }
                        }
                        if (cont == camposcentralizadalst.length) {
                            actualizado = true;
                            console.log('Nombres y Apellidos actualizados correctamente')
                        }
                    }
                }
                //lst.push(objpersona);
                break;
            case 3:   // gestiona conyuge verificando el estado civil registrado
                if (valor != "") {
                    actualizado = true;
                    var actualizacion = centralizada.actualizarpersona(tablacentralizada, campocentralizada, valor, objpersona.per_id, function (Result) { });
                    if (actualizacion) {
                        console.log('Datos conyuge actualizado correctamente')
                    }
                    console.log("conyuge: " + valor)
                }
                else {
                    console.log("No existe información de conyuge")
                }
                break;
            default:
                break;
        }
        if (actualizado) {
            var fechamodificacion = formatDate(new Date())
            var actualizacionfecha = centralizada.actualizarpersona('persona', 'per_fechaModificacion', fechamodificacion, objpersona.per_id, function (Result) { });
            if (actualizacionfecha) {
                console.log('Fecha de modificación de la persona actualizada correctamente')
            }
            else {
                console.log('No se ha realizado la actualización de la fecha de modificación de la persona')
            }
            var personaactualizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(objpersona.pid_valor, (err, valor) => { resolve(valor); }) });
            callback(null, personaactualizada);
        }
        else {
            callback(null, objpersona);
        }

    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
async function consumirserviciodinardap(tipo, cedula, res, personas, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaq;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.getFichaGeneral(args, async function (err, result) {
                    if (err) {
                        console.log('Error: ' + err)
                        callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listacamposdinardap = objjson.instituciones[0].datosPrincipales.registros;
                        for (campos of listacamposdinardap) {
                            listado.push(campos);
                        }
                        if (listado.length > 0) {
                            if (tipo == 1) {
                                var fechamodificacion = formatDate(new Date());
                                ////consume la dinardap y actualiza los campos establecidos en la base
                                let listacamposactualizar = [];
                                var campos = await new Promise(resolve => { centralizada.listacamposactualizar((err, valor) => { resolve(valor); }) });
                                if (campos.length > 0) {
                                    for (camposbase of campos) {
                                        listacamposactualizar.push(camposbase);
                                    }
                                    var datosconyuge = "";
                                    var blnconyuge = false;
                                    var cont = 0;
                                    var personaactualizada = {};
                                    for (campoactualizar of listacamposactualizar) {
                                        for (atr of listado) {
                                            if (campoactualizar.ca_nombredinardap == atr.campo) {
                                                cont = cont + 1;
                                                let nombrecampo = atr.campo;
                                                personaactualizada = await new Promise(resolve => { actualizarcamposportipo(campoactualizar.ca_tipo, campoactualizar.ca_nombrecentralizada, campoactualizar.ca_tablacentralizada, atr.valor, personas[0], (err, valor) => { resolve(valor); }) });

                                            }
                                        }
                                    }
                                    if (cont > 0) {
                                        personas[0] = personaactualizada;
                                        callback(null, personaactualizada);
                                    }

                                }
                                else {
                                    console.log('No existen registros para actualizar')
                                    callback(null, personas[0]);
                                }
                            }
                            else {
                                ////consume la dinardap y crea el objeto en la centralizada
                                var pospalabra = [];
                                var cont = 0;
                                var contpalabracorta = false;
                                console.log('Persona no registrada en la centralizada')
                                let personacentralizada = {};
                                var cedulanueva = "";
                                var nombrescompletos = "";
                                var primerApellido = "";
                                var segundoApellido = "";
                                var fechaNacimiento = "";
                                var idestadocivil = 1;
                                var idsexo = 1;
                                var idgenero = 1;
                                var idprovincia = 1;
                                var idciudad = 1;
                                var idparroquia = 1;
                                var procedenciapersona = "";
                                var lugarprocedencia = "";
                                var conyuge = "";
                                var idconyuge = "";
                                var calleprincipal = "";
                                var numerocasa = "";
                                var idnacionalidad = "1";
                                var blnvisatrabajo = "false";
                                for (atr of listado) {
                                    if (atr.campo == "cedula") {
                                        cedulanueva = atr.valor;
                                    }
                                    if (atr.campo == "nombre") {
                                        const nombres = atr.valor.split(" ");
                                        if (nombres.length > 0) {
                                            for (var i = 0; i < nombres.length; i++) {
                                                if (nombres[i].length <= 3) {
                                                    contpalabracorta = true
                                                    pospalabra[cont] = nombres[i] + ' ' + nombres[i + 1]
                                                    i = i + 1
                                                }
                                                else {
                                                    pospalabra[cont] = nombres[i];
                                                }
                                                cont = cont + 1;
                                            }
                                            console.log(pospalabra)
                                            if (pospalabra.length < 4) {
                                                if (contpalabracorta) {
                                                    primerApellido = pospalabra[0]
                                                    segundoApellido = ''
                                                    for (var c = 1; c < pospalabra.length; c++) {
                                                        console.log(pospalabra[c])
                                                        nombrescompletos = nombrescompletos + pospalabra[c] + ' '
                                                    }
                                                }
                                                else {
                                                    if (pospalabra.length == 2) {
                                                        primerApellido = pospalabra[0]
                                                        segundoApellido = ''
                                                        nombrescompletos = pospalabra[1]
                                                    } else {
                                                        primerApellido = pospalabra[0]
                                                        segundoApellido = pospalabra[1]
                                                        nombrescompletos = pospalabra[2]
                                                    }
                                                }
                                            }
                                            else {
                                                primerApellido = pospalabra[0]
                                                segundoApellido = pospalabra[1]
                                                for (var c = 2; c < pospalabra.length; c++) {
                                                    nombrescompletos = nombrescompletos + pospalabra[c] + ' '
                                                }
                                            }
                                        }
                                    }
                                    if (atr.campo == "fechaNacimiento") {
                                        fechaNacimiento = atr.valor;
                                    }
                                    if (atr.campo == "estadoCivil") {
                                        var estadocivil = await new Promise(resolve => { centralizada.obtenerestadocivildadonombre(atr.valor, (err, valor) => { resolve(valor); }) });
                                        if (estadocivil.length > 0) {
                                            idestadocivil = estadocivil[0].eci_id;
                                        }
                                    }
                                    if (atr.campo == "sexo") {
                                        var sexo = await new Promise(resolve => { centralizada.obtenersexodadonombre(atr.valor, (err, valor) => { resolve(valor); }) });
                                        if (sexo.length > 0) {
                                            idsexo = sexo[0].sex_id;
                                        }
                                        if (atr.valor.includes('HOMBRE')) {
                                            idgenero = 1;
                                        }
                                        else {
                                            if (atr.valor.includes('MUJER')) {
                                                idgenero = 2;
                                            }
                                            else {
                                                idgenero = 3;
                                            }
                                        }
                                    }
                                    if (atr.campo == "callesDomicilio") {
                                        calleprincipal = atr.valor;
                                    }
                                    if (atr.campo == "numeroCasa") {
                                        numerocasa = atr.valor;
                                    }
                                    if (atr.campo == "lugarNacimiento") {
                                        const lugarNacimiento = atr.valor.split("/");
                                        if (lugarNacimiento.length > 0) {
                                            var provincia = lugarNacimiento[0];
                                            if (lugarNacimiento.length > 1) {
                                                var ciudad = lugarNacimiento[1];
                                                var parroquia = lugarNacimiento[2];
                                            } else {
                                                var ciudad = 1;
                                                var parroquia = 1;
                                            }
                                            var objprovincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('provincia', 'pro_nombre', provincia, (err, valor) => { resolve(valor); }) });
                                            if (objprovincia.length > 0) {
                                                idprovincia = objprovincia[0].pro_id;
                                            }
                                            else {
                                                idprovincia = 1;
                                            }
                                            var objciudad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('ciudad', 'ciu_nombre', ciudad, (err, valor) => { resolve(valor); }) });
                                            if (objciudad.length > 0) {
                                                idciudad = objciudad[0].ciu_id;
                                            }
                                            var objparroquia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('parroquia', 'prq_nombre', parroquia, (err, valor) => { resolve(valor); }) });
                                            if (objparroquia.length > 0) {
                                                idparroquia = objparroquia[0].prq_id;
                                            }
                                            var procedenciapersona = idprovincia + '|' + idciudad + '|' + idparroquia;
                                            var lugarprocedencia = idparroquia;
                                        }
                                    }
                                    if (atr.campo == "conyuge") {
                                        conyuge = atr.valor;
                                    }
                                    if (atr.campo == "cedulaConyuge") {
                                        idconyuge = atr.valor;
                                    }
                                    if (atr.campo == "nacionalidad") {
                                        var nacionalidad = atr.valor;
                                        var objnacionalidad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('nacionalidad', 'nac_nombre', nacionalidad, (err, valor) => { resolve(valor); }) });
                                        if (objnacionalidad.length > 0) {
                                            idnacionalidad = objnacionalidad[0].nac_id;
                                            blnvisatrabajo = objnacionalidad[0].nac_requiereVisaTrabajo;
                                        }
                                    }
                                    personacentralizada = {
                                        per_nombres: nombrescompletos,
                                        per_primerapellido: primerApellido,
                                        per_segundoapellido: segundoApellido,
                                        per_fechanacimiento: fechaNacimiento,
                                        tsa_id: 1,
                                        etn_id: 8,
                                        eci_id: idestadocivil,
                                        gen_id: idgenero,
                                        per_creadopor: 0,
                                        per_fechacreacion: formatDate(new Date()),
                                        per_modificadopor: 0,
                                        per_fechamodificacion: formatDate(new Date()),
                                        lugarprocedencia_id: lugarprocedencia,
                                        sex_id: idsexo,
                                        per_procedencia: procedenciapersona,
                                        per_conyuge: conyuge,
                                        per_idconyuge: idconyuge,
                                        per_cedula: cedulanueva,
                                        dir_calleprincipal: calleprincipal,
                                        dir_numcasa: numerocasa,
                                        per_nacionalidad: idnacionalidad,
                                        nac_reqvisa: blnvisatrabajo,
                                        admision: false
                                    }

                                }
                                //console.log(personacentralizada)
                                var ingresopersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(personacentralizada, (err, valor) => { resolve(valor); }) });
                                if (ingresopersona) {
                                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personacentralizada.per_nombres, personacentralizada.per_primerapellido, personacentralizada.per_segundoapellido, personacentralizada.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                                    if (persona.length > 0) {
                                        listadevuelta.push(persona[0])
                                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(cedulanueva, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                                        if (documentopersonalreg) {
                                            ////pendiente registrar en la tabla domicilio y nacionalidad
                                            var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, personacentralizada.dir_calleprincipal, personacentralizada.dir_numcasa, idparroquia, (err, valor) => { resolve(valor); }) });
                                            if (ingresodireccion) {
                                                var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, personacentralizada.nac_reqvisa, personacentralizada.per_nacionalidad, (err, valor) => { resolve(valor); }) });
                                                if (ingresoNacionalidad) {
                                                    console.log('Registro ingresado correctamente')
                                                    callback(null, persona);
                                                }
                                            }
                                            var instruccionformal = await new Promise(resolve => { verificarinstruccionformalpersona(persona[0].per_id, (err, valor) => { resolve(valor); }) });
                                            if (instruccionformal != null) {
                                                console.log('Registros de instruccion formal ingresado correctamente')
                                                callback(null, persona);
                                            }
                                        }
                                    }
                                }
                                else {
                                    console.log('Error al registrar persona')
                                    callback(null);
                                }
                            }
                        }
                        else {
                            console.log('Error')
                            callback(null);
                        }
                    }
                });
            } else {
                if ((tipo == 1)) {
                    callback(null, personas[0]);
                } else {
                    callback(null);
                    console.log('Error consumo dinardap: ' + err)
                }
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}
function formatDate(date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
        ].join('-') +
        ' ' +
        [
            padTo2Digits(date.getHours()),
            padTo2Digits(date.getMinutes()),
            padTo2Digits(date.getSeconds()),
        ].join(':')
    );
}
function formatofechasinhora(date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
        ].join('-')
    );
}
async function verificarinstruccionformalpersona(idpersona, callback) {
    let listacodigos = [];
    var listatitulosdinardap = [];
    var listatitulosregistrar = [];
    let titulosregistrados = [];
    var datos = true;
    try {
        var documentopersonal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('documentoPersonal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
        if ((documentopersonal == null) || (documentopersonal.length == 0)) {
            console.log('Error: la persona no posee documentos personales registrados en la base de datos')
            return callback(null)
        }
        else {
            for (objdocumento of documentopersonal) {
                var cedula = objdocumento.pid_valor;
                if (cedula.length > 10) {
                    cedula = cedula.substring(0, 10)
                }
                console.log('Buscar dinardap pid_Valor: ' + cedula)
                var titulosdinardap = await new Promise(resolve => { serviciodinardapminEducacion(cedula, (err, valor) => { resolve(valor); }) });
                var titulosdinardapsenescyt = await new Promise(resolve => { serviciodinardapsenescyt(cedula, (err, valor) => { resolve(valor); }) });
                if (titulosdinardap != null) {
                    if (titulosdinardapsenescyt != null) {
                        for (titulo of titulosdinardap) {
                            listatitulosdinardap.push(titulo);
                        }
                        for (titulosenescyt of titulosdinardapsenescyt) {
                            listatitulosdinardap.push(titulosenescyt)
                        }
                    }
                    else {
                        listatitulosdinardap = titulosdinardap;
                    }
                }
                else {
                    if (titulosdinardapsenescyt != null) {
                        listatitulosdinardap = titulosdinardapsenescyt;
                    }
                    else {
                        datos = false;
                    }
                }
                var objinstruccionformal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('instruccionFormal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
                if ((objinstruccionformal != null) && (objinstruccionformal.length > 0)) {
                    for (titulodinard of listatitulosdinardap) {
                        var registrado = false;
                        for (tituloregcentral of objinstruccionformal) {
                            if (tituloregcentral.ifo_registro == titulodinard.codigorefrendacion) {
                                registrado = true;
                            }
                        }
                        if (!registrado) {
                            listatitulosregistrar.push(titulodinard)
                        }
                    }
                    if (listatitulosregistrar.length > 0) {
                        /////registra los titulos en la centralizada}
                        for (tituloregistrar of listatitulosregistrar) {
                            var registrotablainstruccion = await new Promise(resolve => { registrartitulocentralizada(tituloregistrar, idpersona, (err, valor) => { resolve(valor); }) });
                            console.log(registrotablainstruccion)
                            if (registrotablainstruccion != null) {
                                titulosregistrados.push(registrotablainstruccion[0])
                                console.log('Titulo Registrado')
                            }
                        }
                        objinstruccionformal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('instruccionFormal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
                    }
                }
                else {
                    if ((listatitulosdinardap.length == 0) || (listatitulosdinardap == null)) {
                        console.log('No existen títulos registrados de la persona en la Dinardap ni en la base centralizada')
                    }
                    else {
                        for (tituloregistrar of listatitulosdinardap) {
                            var registrotablainstruccion = await new Promise(resolve => { registrartitulocentralizada(tituloregistrar, idpersona, (err, valor) => { resolve(valor); }) });
                            if (registrotablainstruccion != null) {
                                titulosregistrados.push(registrotablainstruccion[0])
                                console.log('Titulo Registrado')
                            }
                        }
                        objinstruccionformal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('instruccionFormal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
                        console.log('datos de la dinardap registrados en la centralizada')
                    }
                }
            }
            return callback(null, objinstruccionformal)
        }
    } catch (err) {
        console.log('Error: ' + err)
        return callback(null)
    }
}
async function serviciodinardapminEducacion(cedulapersona, callback) {
    let listado = [];
    try {
        let registroministerio = {};
        var cedula = "";
        var nombre = "";
        var institucion = "";
        var titulo = "";
        var especialidad = "";
        var codigorefrendacion = 1;
        var fechagrado = 1;
        var nivel = 2;
        var url = urlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaqMinEducacion;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedulapersona };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.getFichaGeneral(args, async function (err, result) {
                    if (err) {
                        console.log('Error servicio: ' + codigopaquete + err)
                        return callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listaregistrosdinardap = objjson.instituciones[0].datosPrincipales.registros;

                        for (registro of listaregistrosdinardap) {
                            if (registro.campo == 'cedula') {
                                cedula = registro.valor;
                            }
                            if (registro.campo == 'nombre') {
                                nombre = registro.valor;
                            }
                            if (registro.campo == 'institucion') {
                                institucion = registro.valor;
                            }
                            if (registro.campo == 'titulo') {
                                titulo = registro.valor;
                            }
                            if (registro.campo == 'espcialidad') {
                                especialidad = registro.valor;
                            }
                            if (registro.campo == 'codigoRefrendacion') {
                                codigorefrendacion = registro.valor;
                            }
                            if (registro.campo == 'fechaGrado') {
                                fechagrado = registro.valor;
                            }
                        }
                        registroministerio = {
                            cedula: cedula,
                            nombre: nombre,
                            institucion: institucion,
                            titulo: titulo,
                            especialidad: especialidad,
                            codigorefrendacion: codigorefrendacion,
                            fechagrado: fechagrado,
                            nivel: 2
                        }
                        listado.push(registroministerio)
                    }
                    return callback(null, listado)
                });
            } else {
                return callback(null);
                console.log('Error consumo dinardap' + err)
            }
        });
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
async function serviciodinardapsenescyt(cedulapersona, callback) {
    try {
        let listado = [];
        let registroministerio = {};
        var cedula = "";
        var nombre = "";
        var institucion = "";
        var titulo = "";
        var especialidad = "";
        var codigorefrendacion = 1;
        var fechagrado = 1;
        var nivel = 2;
        var url = urlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaqSenescyt;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedulapersona };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.getFichaGeneral(args, async function (err, result) {
                    if (err) {
                        console.log('Error servicio: ' + codigopaquete + err)
                        return callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listaregistrosdinardap = objjson.instituciones[0].detalle.items;
                        console.log(listaregistrosdinardap)
                        for (registro of listaregistrosdinardap) {
                            let listacamposporregistro = registro.registros;
                            for (campos of listacamposporregistro) {
                                if (campos.campo == 'fechaRegistro') {
                                    fechagrado = campos.valor;
                                }
                                if (campos.campo == 'ies') {
                                    institucion = campos.valor;
                                }
                                if (campos.campo == 'nombreTitulo') {
                                    titulo = campos.valor;
                                }
                                if (campos.campo == 'numeroRegistro') {
                                    codigorefrendacion = campos.valor;
                                }
                            }
                            if (registro.nombre.includes('Técnico Superior')) {
                                nivel = 6;
                            } else {
                                if (registro.nombre.includes('Posgrado')) {
                                    nivel = 4;
                                }
                                else {
                                    nivel = 3;
                                }
                            }
                            registroministerio = {
                                cedula: cedulapersona,
                                nombre: nombre,
                                institucion: institucion,
                                titulo: titulo,
                                especialidad: especialidad,
                                codigorefrendacion: codigorefrendacion,
                                fechagrado: fechagrado,
                                nivel: nivel
                            }
                            listado.push(registroministerio)
                        }
                        return callback(null, listado);
                    }
                });
            } else {
                return callback(null);
                console.log('Error consumo dinardap: ' + err)
            }
        });
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
async function registrartitulocentralizada(objtitulodinardap, per_id, callback) {
    try {
        var titulos = [];
        if (objtitulodinardap.especialidad.length > 0) {
            titulos = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('titulo', 'tit_nombre', objtitulodinardap.titulo + ' ' + objtitulodinardap.especialidad, (err, valor) => { resolve(valor); }) });
        }
        else {
            titulos = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('titulo', 'tit_nombre', objtitulodinardap.titulo, (err, valor) => { resolve(valor); }) });
        }
        if ((titulos == null) || (titulos.length == 0)) {
            console.log('registrar titulo en la base de datos')
            var registrotitulo = await new Promise(resolve => { centralizada.ingresotitulo(objtitulodinardap.titulo, objtitulodinardap.nivel, (err, valor) => { resolve(valor); }) });
            if (registrotitulo) {
                var titulos = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('titulo', 'tit_nombre', objtitulodinardap.titulo + ' ' + objtitulodinardap.especialidad, (err, valor) => { resolve(valor); }) });
            }
            else {
                console.log('Error en el registro del titulo en la centralizada')
                return callback(null)
            }
        }
        var instituciones = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('institucion', 'ins_nombre', objtitulodinardap.institucion, (err, valor) => { resolve(valor); }) });
        if ((instituciones == null) || (instituciones.length == 0)) {
            console.log('registrar institución en la base de datos')
            var registroinstitucion = await new Promise(resolve => { centralizada.ingresoinstitucion(objtitulodinardap.institucion, (err, valor) => { resolve(valor); }) });
            if (registroinstitucion) {
                var instituciones = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('institucion', 'ins_nombre', objtitulodinardap.institucion, (err, valor) => { resolve(valor); }) });
            }
            else {
                console.log('Error en el registro de la institución en la centralizada')
                return callback(null)
            }
        }
        var titulosacademicos = await new Promise(resolve => { centralizada.obtenertituloacademicodadoidinstitucionytitulo(instituciones[0].ins_id, titulos[0].tit_id, (err, valor) => { resolve(valor); }) });
        if ((titulosacademicos == null) || (titulosacademicos.length == 0)) {
            console.log('registrar titulo academico en la base de datos')
            var registrartituloacademico = await new Promise(resolve => { centralizada.ingresoTituloAcademico(titulos[0].tit_id, instituciones[0].ins_id, (err, valor) => { resolve(valor); }) });
            if (registrartituloacademico) {
                console.log('Registro exitoso en la tabla titulo academico')
                var titulosacademicos = await new Promise(resolve => { centralizada.obtenertituloacademicodadoidinstitucionytitulo(instituciones[0].ins_id, titulos[0].tit_id, (err, valor) => { resolve(valor); }) });
            }
            else {
                console.log('Error en el registro de la tabla tituloAcademico')
                return callback(null)
            }
        }
        var instruccionFormal = await new Promise(resolve => { centralizada.obtenerinstruccionformaldadoidpersonaynumregistro(per_id, objtitulodinardap.codigorefrendacion, (err, valor) => { resolve(valor); }) });
        if ((instruccionFormal == null) || (instruccionFormal.length == 0)) {
            var fechadinardap = new Date(objtitulodinardap.fechagrado);
            var fecharegistro = formatofechasinhora(fechadinardap);
            var registroinstruccionformal = await new Promise(resolve => { centralizada.ingresoInstruccionFormal(per_id, titulosacademicos[0].tac_id, 0, objtitulodinardap.codigorefrendacion, fecharegistro, (err, valor) => { resolve(valor); }) });
            if (registroinstruccionformal) {
                console.log('Registro exitoso en la tabla instrucción formal')
                instruccionFormal = await new Promise(resolve => { centralizada.obtenerinstruccionformaldadoidpersonaynumregistro(per_id, objtitulodinardap.codigorefrendacion, (err, valor) => { resolve(valor); }) });
                return callback(null, instruccionFormal[0])
            }
            else {
                console.log('Error: no se han registrado datos en la tabla instrucción formal')
                return callback(null)
            }
        }
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
module.exports = router;