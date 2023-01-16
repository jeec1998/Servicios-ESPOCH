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
            if ((resultadoresta > numerodias) && (numerodias != 0)) {
                var listadinardap = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                if (listadinardap != null) {
                    listado.push(listadinardap);
                    console.log('Datos de la persona actualizados en la centralizada')
                }
                else {
                    listado.push(persona[0]);
                    console.log('Datos de la persona no actualizados en la centralizada')
                }
            }
            else {
                listado.push(persona[0]);
                console.log('Persona devuelta de la centralizada')
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
                    return res.json({
                        success: true,
                        listado: registrar[0]
                    });
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
                    success: true,
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

async function actualizarcamposportipo(idtipo, campocentralizada, tablacentralizada, valor, objpersona, callback) {
    try {
        let lst = [];
        switch (idtipo) {
            case 1:  // busca el id de estado civil en la centralizada y actualiza el registro de persona
                var estadocivil = await new Promise(resolve => { centralizada.obtenerestadocivildadonombre(valor, (err, valor) => { resolve(valor); }) });
                if (estadocivil.length > 0) {
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
                            console.log('Nombres y Apellidos actualizados correctamente')
                        }
                    }
                }
                //lst.push(objpersona);
                break;
            case 3:   // gestiona conyuge verificando el estado civil registrado
                if (valor != "") {
                    console.log("conyuge: " + valor)
                }
                else {
                    console.log("No existe información de conyuge")
                }
                //lst.push(objpersona);
                break;
            default:
                //lst.push(objpersona);
                break;
        }
        callback(null, objpersona);
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
                                    for (campoactualizar of listacamposactualizar) {
                                        for (atr of listado) {
                                            if (campoactualizar.ca_nombredinardap == atr.campo) {
                                                let nombrecampo = atr.campo;
                                                if ((nombrecampo.includes("conyuge")) || (nombrecampo.includes("Conyuge"))) {
                                                    datosconyuge = datosconyuge + atr.valor + " ";
                                                    blnconyuge = true;
                                                }
                                                else {                                                    
                                                    var personaactualizada = await new Promise(resolve => { actualizarcamposportipo(campoactualizar.ca_tipo, campoactualizar.ca_nombrecentralizada, campoactualizar.ca_tablacentralizada, atr.valor, personas[0], (err, valor) => { resolve(valor); }) });
                                                    callback(null, personaactualizada);
                                                };
                                            }
                                        }
                                    }
                                    if (blnconyuge) {
                                        ////pendiente enviar a modificar conyuge
                                        //console.log('Datos conyuge: ' + datosconyuge)
                                    }
                                }
                                else {
                                    //console.log('No existen registros para actualizar')
                                }
                            }
                            else {
                                ////consume la dinardap y crea el objeto en la centralizada
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
                                            nombrescompletos = "";
                                            primerApellido = nombres[0];
                                            segundoApellido = nombres[1];
                                            for (var i = 2; i < nombres.length; i++) {
                                                nombrescompletos = nombrescompletos + nombres[i] + " ";
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
                                            var ciudad = lugarNacimiento[1];
                                            var parroquia = lugarNacimiento[2];
                                            var objprovincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('provincia', 'pro_nombre', provincia, (err, valor) => { resolve(valor); }) });
                                            if (objprovincia.length > 0) {
                                                idprovincia = objprovincia[0].pro_id;
                                            }
                                            var objciudad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('ciudad', 'ciu_nombre', ciudad, (err, valor) => { resolve(valor); }) });
                                            if (objciudad.length > 0) {
                                                idciudad = objciudad[0].ciu_id;
                                            }
                                            var objparroquia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('parroquia', 'prq_nombre', parroquia, (err, valor) => { resolve(valor); }) });
                                            if (objparroquia.length > 0) {
                                                idparroquia = objparroquia[0].prq_id;
                                            }
                                            var procedenciapersona = idprovincia + '/' + idciudad + '/' + idparroquia;
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
                                        nac_reqvisa: blnvisatrabajo
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
module.exports = router;