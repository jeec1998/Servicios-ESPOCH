const express = require('express');
const router = express.Router();
const Request = require("request");
const crypto = require('crypto');
const centralizada = require('./../modelo/centralizada');
const urlAcademico = require('../config/urlAcademico');
const soap = require('soap');
const pathimage = require('path');
const { Console } = require('console');

router.get('/diaactualizacion/', (req, res) => {
    try {
        obtenerdiasdeactualizacion(function (Resultado) {
            if (Resultado != 0) {
                var diasactualizar = Resultado;
                console.log('Resultado: ' + diasactualizar)
                return res.json({
                    success: true,
                    numerodias: Resultado
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
router.get('/personaPorDocumento/:strCedula', (req, res) => {
    const strCedula = req.params.strCedula;
    var datos;
    Request.get("http://servicioscentral.espoch.edu.ec/Central/ServiciosPersona.svc/ObtenerPorDocumento/" + strCedula, (error, response, body) => {
        if (body == "") {
            return res.json({
                success: false
            });
        } else {
            datos = JSON.parse((body))
            res.json({
                success: true,
                datos
            });
        }
    });
});
router.get('/personaPorApellido/:strApellido', (req, res) => {
    const strApellido = req.params.strApellido;
    var datos;
    Request.get("http://servicioscentral.espoch.edu.ec/Central/ServiciosPersona.svc/ObtenerPorApellido/" + strApellido, (error, response, body) => {
        if (body == "") {
            return res.json({
                success: false
            });
        } else {
            datos = JSON.parse((body))
            res.json({
                success: true,
                datos
            });
        }
    });
});
router.get('/personaPorCorreo/:strCorreo', (req, res) => {
    const strCorreo = req.params.strCorreo;
    var datos;
    Request.get("http://servicioscentral.espoch.edu.ec/Central/ServiciosPersona.svc/ObtenerPorEmail/" + strCorreo, (error, response, body) => {
        if (body == "") {
            return res.json({
                success: false
            });
        } else {
            datos = JSON.parse((body))
            res.json({
                success: true,
                datos
            });
        }
    });
});
router.get('/personaPorId/:strId', (req, res) => {
    const strId = req.params.strId;
    var datos;
    Request.get("http://servicioscentral.espoch.edu.ec/Central/ServiciosDocumentoPersonal.svc/ObtenerDocumentoActivoPorPersona/" + strId, (error, response, body) => {
        if (body == "") {
            return res.json({
                success: false
            });
        } else {
            datos = JSON.parse((body))
            res.json({
                success: true,
                datos
            });
        }
    });
});
router.get('/validarCas/:id', (req, res) => {
    const id = req.params.id;
    const https = require('https');
    const url = "https://seguridad.espoch.edu.ec/cas/p3/serviceValidate?" + id;
    var datos;
    const request = require('request');
    request.get({
        rejectUnauthorized: false,
        url: url,
        json: true
    }, function (error, response, body) {
        return res.json(body);
    });
});
router.get('/personaCargo/:id', (req, res) => {
    const id = req.params.id;
    const https = require('https');
    const url = "https://swtalentohumano.espoch.edu.ec/funcionariosWS/wstthh/funcionariopuesto/" + id;
    var datos;
    const request = require('request');
    request.get({
        rejectUnauthorized: false,
        url: url,
        json: true
    }, function (error, response, body) {
        return res.json({ success: true, cargo: body });
    });
});
router.get('/personaGrupo/:op/:param1/:param2/:param3', (req, res) => {
    const opc = req.params.op;
    const cond1 = req.params.param1;
    const cond2 = req.params.param2;
    const cond3 = req.params.param3;
    const https = require('https');
    const url = "https://swcentromedico.espoch.edu.ec/rutaUsuario/getInfoOtros/" + opc + "/" + cond1 + "/" + cond2 + "/" + cond3;
    var datos;
    const request = require('request');
    request.get({
        rejectUnauthorized: false,
        url: url,
        json: true
    }, function (error, response, body) {
        return res.json(body);
    });
});
router.post('/envioCorreo', (req, res) => {
    var request = require('request');
    const strAsunto = req.body.strAsunto;
    const strCodigoSistema = req.body.strCodigoSistema;
    const strBody = req.body.strBody;
    const lstReceptores = req.body.lstReceptores;
    const lstArchivosAdjuntos = req.body.lstArchivosAdjuntos;
    var jsonDataObj = req.body;
    request.post({
        url: 'https://emailrelay.espoch.edu.ec/WebCorreoInstitucional/ServiciosCorreos/EnviarCorreo',
        body: jsonDataObj,
        rejectUnauthorized: false,
        json: true
    }, function (error, response, body) {
        res.json({
            success: body.success,
            mensajes: body.mensaje
        });
    });
});
router.get('/generarkey/:dependencia', (req, res) => {
    const id = req.params.dependencia;
    const myArray = id.split(" ");
    var dependencia = "";
    if (myArray.length > 0) {
        for (var a = 0; a < myArray.length; a++) {
            dependencia = dependencia + myArray[a];
        }
    }
    else {
        dependencia = id;
    }
    console.log("dependencia sin espacios: " + dependencia)
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' + dependencia;
    var charactersLength = characters.length;
    for (var i = 0; i < 50; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log(result.toLowerCase())
    /*
    
    const request = require('request');
    request.get({
        rejectUnauthorized: false,
        url: url,
        json: true
    }, function (error, response, body) {
        return res.json({ success: true, cargo: body });
    });*/
});
router.get('/listanacionalidades/', async (req, res) => {
    try {
        var nacionalidades = await new Promise(resolve => { centralizada.obtenerregistrosportabla('nacionalidad', (err, valor) => { resolve(valor); }) });
        if (nacionalidades.length > 0) {
            return res.json({
                success: true,
                listado: nacionalidades
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/listagenero/', async (req, res) => {
    try {
        var genero = await new Promise(resolve => { centralizada.obtenerregistrosportabla('genero', (err, valor) => { resolve(valor); }) });
        if (genero.length > 0) {
            return res.json({
                success: true,
                listado: genero
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/listaetnias/', async (req, res) => {
    try {
        var etnias = await new Promise(resolve => { centralizada.obtenerregistrosportabla('etnia', (err, valor) => { resolve(valor); }) });
        if (etnias.length > 0) {
            return res.json({
                success: true,
                listado: etnias
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/listapais/', async (req, res) => {
    try {
        var pais = await new Promise(resolve => { centralizada.obtenerregistrosportabla('pais', (err, valor) => { resolve(valor); }) });
        if (pais.length > 0) {
            return res.json({
                success: true,
                listado: pais
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/listaprovinciadadopais/:idpais', async (req, res) => {
    const idpais = req.params.idpais;
    try {
        var provincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('provincia', 'pai_id', idpais, (err, valor) => { resolve(valor); }) });
        if (provincia.length > 0) {
            return res.json({
                success: true,
                listado: provincia
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/listaciudadesdadoidprovincia/:idprovincia', async (req, res) => {
    const idprovincia = req.params.idprovincia;
    try {
        var ciudades = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('ciudad', 'pro_id', idprovincia, (err, valor) => { resolve(valor); }) });
        if (ciudades.length > 0) {
            return res.json({
                success: true,
                listado: ciudades
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/obtenerprovinciadadoid/:idprovincia', async (req, res) => {
    const idprovincia = req.params.idprovincia;
    try {
        var provincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('provincia', 'pro_id', idprovincia, (err, valor) => { resolve(valor); }) });
        if (provincia.length > 0) {
            return res.json({
                success: true,
                provincia: provincia[0]
            });
        }
        else {
            return res.json({
                success: true,
                provincia: {}
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/obtenerciudaddadoid/:idciudad', async (req, res) => {
    const idciudad = req.params.idciudad;
    try {
        var ciudades = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('ciudad', 'ciu_id', idciudad, (err, valor) => { resolve(valor); }) });
        if (ciudades.length > 0) {
            return res.json({
                success: true,
                ciudad: ciudades[0]
            });
        }
        else {
            return res.json({
                success: true,
                ciudad: {}
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/obtenerparroquiadadoid/:idparroquia', async (req, res) => {
    const idparroquia = req.params.idparroquia;
    try {
        var parroquias = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('parroquia', 'prq_id', idparroquia, (err, valor) => { resolve(valor); }) });
        if (parroquias.length > 0) {
            return res.json({
                success: true,
                parroquia: parroquias[0]
            });
        }
        else {
            return res.json({
                success: true,
                parroquia: {}
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/obtenernacionalidaddadoid/:idnacionalidad', async (req, res) => {
    const idnacionalidad = req.params.idnacionalidad;
    try {
        var nacionalidades = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('nacionalidad', 'nac_id', idnacionalidad, (err, valor) => { resolve(valor); }) });
        if (nacionalidades.length > 0) {
            return res.json({
                success: true,
                nacionalidad: nacionalidades[0]
            });
        }
        else {
            return res.json({
                success: true,
                nacionalidad: {}
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/listaparroquiasdadoidciudad/:idciudad', async (req, res) => {
    const idciudad = req.params.idciudad;
    try {
        var parroquias = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('parroquia', 'ciu_id', idciudad, (err, valor) => { resolve(valor); }) });
        if (parroquias.length > 0) {
            return res.json({
                success: true,
                listado: parroquias
            });
        }
        else {
            return res.json({
                success: true,
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
router.get('/objpersonalizado/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(cedula, (err, valor) => { resolve(valor); }) });
        console.log(personapersonalizada)
        if (personapersonalizada != null) {
            if (personapersonalizada.length > 0) {
                var procedenciapersona = personapersonalizada[0].per_procedencia;
                const myArray = procedenciapersona.split("|");
                if (myArray.length > 0) {
                    if (myArray[1] != '1') {
                        var provincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('provincia', 'pro_id', myArray[0], (err, valor) => { resolve(valor); }) });
                        if (provincia.length > 0) {
                            var ciudad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('ciudad', 'ciu_id', myArray[1], (err, valor) => { resolve(valor); }) });
                            if (ciudad.length > 0) {
                                var parroquia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('parroquia', 'prq_id', myArray[2], (err, valor) => { resolve(valor); }) });
                                if (parroquia.length > 0) {
                                    var procedenciastring = provincia[0].pro_nombre + "/" + ciudad[0].ciu_nombre + "/" + parroquia[0].prq_nombre;
                                    personapersonalizada[0].procedencia = procedenciastring;
                                }
                                else {
                                    return res.json({
                                        success: false,
                                        mensaje: 'No existen registros de parroquia de la persona'
                                    });
                                }
                            }
                            else {
                                return res.json({
                                    success: false,
                                    mensaje: 'No existen registros de ciudad de la persona'
                                });
                            }
                        }
                        else {
                            var pais = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('pais', 'pai_id', myArray[0], (err, valor) => { resolve(valor); }) });
                            if (pais.length > 0) {
                                personapersonalizada[0].procedencia = pais[0].pai_nombre;
                            }
                            else {
                                return res.json({
                                    success: false,
                                    mensaje: 'No existen registros de provincia de la persona'
                                });
                            }
                        }
                    } else {
                        var pais = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('pais', 'pai_id', myArray[0], (err, valor) => { resolve(valor); }) });
                        if (pais.length > 0) {
                            personapersonalizada[0].procedencia = pais[0].pai_nombre + "/NO ESPECIFICADO/NO ESPECIFICADO";
                        }
                        else {
                            return res.json({
                                success: false,
                                mensaje: 'No existen registros de provincia de la persona'
                            });
                        }
                    }
                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existen registros de procedencia de la persona'
                    });
                }
                return res.json({
                    success: true,
                    listado: personapersonalizada
                });
            }
            else {
                return res.json({
                    success: false,
                    mensaje: 'No existen registros en la base de datos'
                });
            }
        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen registros en la base de datos'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.post('/actualizarpersona', async (req, res) => {
    var request = require('request');
    var jsonDataObj = req.body;
    var fecha = formatDate(new Date());
    var actualizacionpersona = await new Promise(resolve => { centralizada.modificardatospersona(jsonDataObj.per_email, jsonDataObj.per_emailAlternativo, jsonDataObj.per_telefonoCelular, jsonDataObj.per_telefonoCasa, jsonDataObj.lugarprocedencia_id, jsonDataObj.gen_id, jsonDataObj.per_id, fecha, jsonDataObj.etn_id, (err, valor) => { resolve(valor); }) });
    if (actualizacionpersona == true) {
        if ((jsonDataObj.idprqdireccion != undefined) && (jsonDataObj.idprqdireccion != 'null')){
            var actualizadireccion = await new Promise(resolve => { centralizada.modificardireccionpersona(jsonDataObj.dir_callePrincipal, jsonDataObj.per_id, jsonDataObj.idprqdireccion, (err, valor) => { resolve(valor); }) });
        }
        if ((jsonDataObj.nac_id != undefined) && (jsonDataObj.nac_id != 'null')) {
            var objnacionalidad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('nacionalidad', 'nac_id', jsonDataObj.nac_id, (err, valor) => { resolve(valor); }) });

            if (objnacionalidad != null) {
                if (objnacionalidad.length > 0) {
                    var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(objnacionalidad[0], jsonDataObj.per_id, (err, valor) => { resolve(valor); }) });
                    if (actualizanacionalidad == true) {
                        console.log('persona actualizada con exito')
                        var personaactualizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(jsonDataObj.pid_valor, (err, valor) => { resolve(valor); }) });
                        return res.json({
                            success: true,
                            listado: personaactualizada
                        });
                    }
                    else {
                        return res.json({
                            success: false,
                            mensaje: 'Error al actualizar o crear registros en la tabla nacionalidad persona',
                            listado: []
                        });
                    }
                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'Error en obtener información del objeto nacionalidad',
                        listado: []
                    });
                }
            }
            else {
                return res.json({
                    success: false,
                    mensaje: 'Error en el registro de la tabla nacionalidad',
                    listado: []
                });
            }
        }
        else {
            var personaactualizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(jsonDataObj.pid_valor, (err, valor) => { resolve(valor); }) });
            return res.json({
                success: true,
                listado: personaactualizada
            });
        }
    }
    else {
        return res.json({
            success: false,
            mensaje: 'Error en el registro de la tabla persona',
            listado: []
        });
    }
});
router.post('/registrarpersona', async (req, res) => {
    var request = require('request');
    var objpersona = req.body;
    var nacionalidadregistrar = 0;
    var fecha = formatDate(new Date());
    try {
        var etnia = objpersona.autoidentificacion;
        var fechadetalle = objpersona.usufechanac.split('/');
        var personamatriz = {};
        var nacionalidad = await new Promise(resolve => { verificacionregistro('nacionalidad', 'nac_nombre', objpersona.nacionalidad, 0, 0, (err, valor) => { resolve(valor); }) });
        var genero = await new Promise(resolve => { verificacionregistro('genero', 'gen_nombre', objpersona.genero, 0, 0, (err, valor) => { resolve(valor); }) });
        var estadocivil = await new Promise(resolve => { centralizada.obtenerregistroempiezaconunvalor('estadoCivil', 'eci_nombre', objpersona.estadocivil, (err, valor) => { resolve(valor); }) });
        var provincia = await new Promise(resolve => { verificacionregistro('provincia', 'pro_nombre', objpersona.provinciareside, 0, 0, (err, valor) => { resolve(valor); }) });
        var sexo = await new Promise(resolve => { verificacionregistro('sexo', 'sex_nombre', objpersona.sexo, 0, 0, (err, valor) => { resolve(valor); }) });
        if (etnia == '') {
            etnia = 8;
        }
        else {
            etnia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('etnia', 'etn_nombre', objpersona.autoidentificacion.substring(0, 3), (err, valor) => { resolve(valor); }) });
            etnia = etnia[0].etn_id;
        }
        if (etnia == '') {
            etnia = 8;
        }
        if (estadocivil == null) {
            estadocivil = 1
        }
        else {
            estadocivil = estadocivil[0].eci_id
        }
        if (genero == null) {
            genero = 3
        }
        else {
            genero = genero.gen_id
        }
        if (sexo == null) {
            sexo = 4
        } else {
            sexo = sexo.sex_id
        }

        var ciudad = await new Promise(resolve => { verificacionregistro('ciudad', 'ciu_nombre', objpersona.cantonreside, provincia.pro_id, 0, (err, valor) => { resolve(valor); }) });
        var parroquia = await new Promise(resolve => { verificacionregistro('parroquia', 'prq_nombre', objpersona.parroquiareside, provincia.pro_id, ciudad.ciu_id, (err, valor) => { resolve(valor); }) });
        var listaapellidos = objpersona.apellidos.split(' ');
        var primerApellido = "";
        var segundoApellido = "";
        if (listaapellidos.length > 0) {
            if (listaapellidos.length == 1) {
                primerApellido = listaapellidos[0];
            }
            else {
                primerApellido = listaapellidos[0];
                for (var i = 1; i < listaapellidos.length; i++) {
                    segundoApellido = segundoApellido + listaapellidos[i];
                }
            }
        }
        personamatriz = {
            per_nombres: objpersona.nombres,
            per_primerapellido: primerApellido,
            per_segundoapellido: segundoApellido,
            per_fechanacimiento: fechadetalle[2] + '-' + fechadetalle[1] + '-' + fechadetalle[0],
            per_email: "",
            per_emailAlternativo: "",
            per_telefonoCelular: "",
            per_telefonoCasa: "",
            tsa_id: 1,
            etn_id: etnia,
            eci_id: estadocivil,
            gen_id: genero,
            per_creadopor: 0,
            per_fechacreacion: formatDate(new Date()),
            per_modificadopor: 0,
            per_fechamodificacion: formatDate(new Date()),
            lugarprocedencia_id: parroquia.prq_id,
            sex_id: sexo,
            per_procedencia: provincia.pro_id + '|' + ciudad.ciu_id + '|' + parroquia.prq_id,
            per_conyuge: "",
            per_idconyuge: "",
            per_cedula: objpersona.identificacion,
            admision: true,
            carnetconadis: objpersona.carnetconadis,
            tipodiscapacidad: objpersona.tipodiscapacidad,
            porcentajediscapacidad: objpersona.porcentajediscapacidad
        }
        var blndiscapacidad = false;
        if (!objpersona.tipodiscapacidad == "") {
            blndiscapacidad = true;
            var objtipodiscapacidad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('tipoDiscapacidad', 'tdi_nombre', objpersona.tipodiscapacidad, (err, valor) => { resolve(valor); }) });
        }
        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if ((personacentralizada == null) || (personacentralizada.length == 0)) {
            //console.log(personamatriz)
            var registrarpersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(personamatriz, (err, valor) => { resolve(valor); }) });
            if (registrarpersona == true) {
                var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personamatriz.per_nombres, personamatriz.per_primerapellido, personamatriz.per_segundoapellido, personamatriz.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                if (persona.length > 0) {
                    var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(personamatriz.per_cedula, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                    if (documentopersonalreg == true) {
                        console.log('Documento personal registrado')
                    }
                    var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, nacionalidad.nac_requiereVisaTrabajo, nacionalidad.nac_id, (err, valor) => { resolve(valor); }) });
                    if (ingresoNacionalidad == true) {
                        console.log('Registro ingresado correctamente')
                    }
                }
            }
        }
        else {
            personacentralizada[0].admision = true;
            var actualizarpersona = await new Promise(resolve => { centralizada.modificarpersonacondatosmatriz(personamatriz, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
            if (actualizarpersona == true) {
                var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(nacionalidad, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if (actualizanacionalidad == true) {
                    console.log('Datos de la persona actualizados correctamente')
                }
            }
        }
        personacentralizada = await new Promise(resolve => { centralizada.obtenerdatospersonaincluidodiscapacidad(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if (blndiscapacidad == true) {
            var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
            if ((carnetdiscregistrado != null) && (carnetdiscregistrado.length > 0)) {
                var discapacidadregistrada = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('discapacidad', 'cdi_id', carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                if ((discapacidadregistrada != null) && (discapacidadregistrada.length > 0)) {
                    discapacidadregistrada.dis_valor = personamatriz.porcentajediscapacidad;
                    discapacidadregistrada.tdi_id = objtipodiscapacidad[0].tdi_id;
                    var discapacidadactualizada = await new Promise(resolve => { centralizada.actualizardiscapacidad(discapacidadregistrada.dis_valor, discapacidadregistrada.tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                    if (discapacidadactualizada == true) {
                        console.log('Discapacidad actualizada')
                    }
                }
                else {
                    ///registrar discapacidad
                    var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(personamatriz.porcentajediscapacidad, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                    if (discapacidadregistrada == true) {
                        console.log('Discapacidad registrada con carnet vigente')
                    }
                }
            }
            else {
                var carnetdis = await new Promise(resolve => { centralizada.ingresocarnetDiscapacidad(personamatriz.carnetconadis, 2, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if (carnetdis == true) {
                    var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                    var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(personamatriz.porcentajediscapacidad, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                    if (discapacidadregistrada == true) {
                        console.log('Discapacidad y carnet de discapacidad registrados')
                    }

                }
            }
        }
        personacentralizada = await new Promise(resolve => { centralizada.obtenerdatospersonaincluidodiscapacidad(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if (personacentralizada[0].dir_callePrincipal == null) {
            personacentralizada[0].dir_callePrincipal = ''
        }
        if (personacentralizada[0].idprqdireccion == null) {
            personacentralizada[0].idprqdireccion = ''
        }
        if (personacentralizada[0].parroquiadireccion == null) {
            personacentralizada[0].parroquiadireccion = ''
        }
        if (personacentralizada[0].idcarnetdiscapacidad == null) {
            personacentralizada[0].idcarnetdiscapacidad = ''
        }
        if (personacentralizada[0].numerocarnetdiscapacidad == null) {
            personacentralizada[0].numerocarnetdiscapacidad = ''
        }
        if (personacentralizada[0].iddiscapacidad == null) {
            personacentralizada[0].iddiscapacidad = ''
        }
        if (personacentralizada[0].porcentajediscapacidad == null) {
            personacentralizada[0].porcentajediscapacidad = ''
        }
        if (personacentralizada[0].idtipodiscapacidad == null) {
            personacentralizada[0].idtipodiscapacidad = ''
        }
        if (personacentralizada[0].tipodiscapacidad == null) {
            personacentralizada[0].tipodiscapacidad = ''
        }
        if (personacentralizada[0].per_emailAlternativo == null) {
            personacentralizada[0].per_emailAlternativo = ''
        }
        if (personacentralizada[0].per_email == null) {
            personacentralizada[0].per_email = ''
        }
        if (personacentralizada[0].per_telefonoCelular == null) {
            personacentralizada[0].per_telefonoCelular = ''
        }
        return res.json({
            success: true,
            listado: personacentralizada
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false,
            mensaje: 'Error: ' + err
        });
    }
});

router.post('/registronuevo', async (req, res) => {
    var request = require('request');
    var objpersona = req.body;
    try {
        var etnia = objpersona.autoidentificacion;
        var fechadetalle = objpersona.fechanac.split('/');
        var personamatriz = {};
        var nacionalidad = await new Promise(resolve => { verificacionregistro('nacionalidad', 'nac_nombre', objpersona.nacionalidad, 0, 0, (err, valor) => { resolve(valor); }) });
        var genero = await new Promise(resolve => { verificacionregistro('genero', 'gen_nombre', objpersona.genero, 0, 0, (err, valor) => { resolve(valor); }) });
        var estadocivil = await new Promise(resolve => { centralizada.obtenerregistroempiezaconunvalor('estadoCivil', 'eci_nombre', objpersona.estadocivil, (err, valor) => { resolve(valor); }) });
        var provincia = await new Promise(resolve => { verificacionregistro('provincia', 'pro_nombre', objpersona.provinciareside, 0, 0, (err, valor) => { resolve(valor); }) });
        var sexo = await new Promise(resolve => { verificacionregistro('sexo', 'sex_nombre', objpersona.sexo, 0, 0, (err, valor) => { resolve(valor); }) });
        if (etnia == '') {
            etnia = 8;
        }
        else {
            etnia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('etnia', 'etn_nombre', objpersona.autoidentificacion.substring(0, 3), (err, valor) => { resolve(valor); }) });
            etnia = etnia[0].etn_id;
        }
        if (etnia == '') {
            etnia = 8;
        }
        if (estadocivil == null) {
            estadocivil = 1
        }
        else {
            estadocivil = estadocivil[0].eci_id
        }
        if (genero == null) {
            genero = 3
        }
        else {
            genero = genero.gen_id
        }
        if (sexo == null) {
            sexo = 4
        } else {
            sexo = sexo.sex_id
        }

        var ciudad = await new Promise(resolve => { verificacionregistro('ciudad', 'ciu_nombre', objpersona.cantonreside, provincia.pro_id, 0, (err, valor) => { resolve(valor); }) });
        var parroquia = await new Promise(resolve => { verificacionregistro('parroquia', 'prq_nombre', objpersona.parroquiareside, provincia.pro_id, ciudad.ciu_id, (err, valor) => { resolve(valor); }) });
        var listaapellidos = objpersona.apellidos.split(' ');
        var primerApellido = "";
        var segundoApellido = "";
        if (listaapellidos.length > 0) {
            if (listaapellidos.length == 1) {
                primerApellido = listaapellidos[0];
            }
            else {
                primerApellido = listaapellidos[0];
                for (var i = 1; i < listaapellidos.length; i++) {
                    segundoApellido = segundoApellido + listaapellidos[i];
                }
            }
        }
        personamatriz = {
            tipodocumento: objpersona.tipodocumento,
            per_nombres: objpersona.nombres,
            per_primerapellido: primerApellido,
            per_segundoapellido: segundoApellido,
            per_fechanacimiento: fechadetalle[2] + '-' + fechadetalle[1] + '-' + fechadetalle[0],
            per_email: objpersona.email,
            per_emailAlternativo: objpersona.emailalternativo,
            per_telefonoCelular: objpersona.telefonocelular,
            per_telefonoOficina: objpersona.telefonooficina,
            tsa_id: 1,
            etn_id: etnia,
            eci_id: estadocivil,
            gen_id: genero,
            per_creadopor: 0,
            per_fechacreacion: formatDate(new Date()),
            per_modificadopor: 0,
            per_fechamodificacion: formatDate(new Date()),
            lugarprocedencia_id: parroquia.prq_id,
            sex_id: sexo,
            per_procedencia: provincia.pro_id + '|' + ciudad.ciu_id + '|' + parroquia.prq_id,
            per_conyuge: "",
            per_idconyuge: "",
            per_cedula: objpersona.identificacion,
            direccion: objpersona.direccion,
            admision: false
        }
        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if ((personacentralizada == null) || (personacentralizada.length == 0)) {
            var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personamatriz.per_nombres, personamatriz.per_primerapellido, personamatriz.per_segundoapellido, personamatriz.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
            if (persona.length == 0) {
                var registrarpersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(personamatriz, (err, valor) => { resolve(valor); }) });
                if (registrarpersona == true) {
                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personamatriz.per_nombres, personamatriz.per_primerapellido, personamatriz.per_segundoapellido, personamatriz.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                    if (persona.length > 0) {
                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(personamatriz.per_cedula, personamatriz.tipodocumento, persona[0].per_id, true, (err, valor) => { resolve(valor); }) });
                        if (documentopersonalreg == true) {
                            console.log('Documento personal registrado correctamente')
                        }
                        var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, nacionalidad.nac_requiereVisaTrabajo, nacionalidad.nac_id, (err, valor) => { resolve(valor); }) });
                        if (ingresoNacionalidad == true) {
                            console.log('Registro de Nacionalidad ingresado correctamente')
                        }
                        var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, personamatriz.direccion, '', personamatriz.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
                        if (ingresodireccion == true) {
                            console.log('Registro Direccion ingresado correctamente')
                        }
                    }
                }
            }
            else {
                var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(personamatriz.per_cedula, personamatriz.tipodocumento, persona[0].per_id, true, (err, valor) => { resolve(valor); }) });
                if (documentopersonalreg == true) {
                    console.log('Documento personal registrado correctamente')
                }
            }
        }
        else {
            var actualizarpersona = await new Promise(resolve => { centralizada.modificarpersona(personamatriz, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
            if (actualizarpersona == true) {
                var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(nacionalidad, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if (actualizanacionalidad == true) {
                    console.log('Datos de la persona actualizados correctamente')
                }
                var actualizardireccion = await new Promise(resolve => { centralizada.modificardireccionpersona(personamatriz.direccion, personacentralizada[0].per_id, personamatriz.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
                if (actualizardireccion == true) {
                    console.log('Direccion actualizada correctamente')
                }
            }
        }
        personacentralizada = await new Promise(resolve => { centralizada.obtenerdatospersonaincluidodiscapacidad(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if (personacentralizada[0].dir_callePrincipal == null) {
            personacentralizada[0].dir_callePrincipal = ''
        }
        if (personacentralizada[0].idprqdireccion == null) {
            personacentralizada[0].idprqdireccion = ''
        }
        if (personacentralizada[0].parroquiadireccion == null) {
            personacentralizada[0].parroquiadireccion = ''
        }
        if (personacentralizada[0].idcarnetdiscapacidad == null) {
            personacentralizada[0].idcarnetdiscapacidad = ''
        }
        if (personacentralizada[0].numerocarnetdiscapacidad == null) {
            personacentralizada[0].numerocarnetdiscapacidad = ''
        }
        if (personacentralizada[0].iddiscapacidad == null) {
            personacentralizada[0].iddiscapacidad = ''
        }
        if (personacentralizada[0].porcentajediscapacidad == null) {
            personacentralizada[0].porcentajediscapacidad = ''
        }
        if (personacentralizada[0].idtipodiscapacidad == null) {
            personacentralizada[0].idtipodiscapacidad = ''
        }
        if (personacentralizada[0].tipodiscapacidad == null) {
            personacentralizada[0].tipodiscapacidad = ''
        }
        if (personacentralizada[0].per_emailAlternativo == null) {
            personacentralizada[0].per_emailAlternativo = ''
        }
        if (personacentralizada[0].per_email == null) {
            personacentralizada[0].per_email = ''
        }
        if (personacentralizada[0].per_telefonoCelular == null) {
            personacentralizada[0].per_telefonoCelular = ''
        }
        return res.json({
            success: true,
            listado: personacentralizada
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false,
            mensaje: 'Error: ' + err
        });
    }
});

router.get('/objetopersonalizadodadoid/:perid', async (req, res) => {
    const perid = req.params.perid;
    try {
        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadadoid(perid, (err, valor) => { resolve(valor); }) });
        if ((personapersonalizada != null) || (personapersonalizada.length > 0)) {
            return res.json({
                success: true,
                listado: personapersonalizada
            });
        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen registros en la base de datos'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
//////no modificar, servicio utilizado en el proceso de admisiones
router.get('/actualizarestadopersona/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(cedula, (err, valor) => { resolve(valor); }) });
        
        if ((personacentralizada != null) || (personacentralizada.length > 0)) {
            var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona("persona", "admision", "true", personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
            console.log(actualizacion)
            if (actualizacion == true) {
                personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(cedula, (err, valor) => { resolve(valor); }) });
            }
            return res.json({
                success: true,
                persona: personacentralizada[0]
            });
        }
        else {
            return res.json({
                success: false,
                mensaje: 'La persona no se encuentra registrada en la base centralizada'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/objetopersonalizadodadoemail/:email', async (req, res) => {
    const email = req.params.email;
    try {
        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadadoemail(email, (err, valor) => { resolve(valor); }) });
        if ((personapersonalizada != null) || (personapersonalizada.length > 0)) {
            return res.json({
                success: true,
                listado: personapersonalizada
            });
        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen registros en la base de datos'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/actualizacionAdmisionCentral/:idperiodo', async (req, res) => {
    const idperiodo = req.params.idperiodo;
    try {
        const url = "https://apinivelacionevaluacion.espoch.edu.ec/api_m4/m_admision/aspirante_sede/list_periodo/" + idperiodo;
        var https = require('https');
        var Request = require("request");
        var fs = require('fs');
        var https = require('https');
        var cer1 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec.key')
        var cer2 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec_2023.crt')
        var cer3 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec_ca.crt')
        Request.get({
            rejectUnauthorized: false,
            url: url,
            json: true
        }, async function (error, response, body) {
            var listainscritos = [];
            listainscritos = body;
            var cont = 0;
            if ((listainscritos.length > 0) && (listainscritos != null)) {
                for (inscrito of listainscritos) {
                    var cedulapostulante = inscrito.perId.perCedula
                    //console.log(cedulapostulante)
                    var datosenescyt = await new Promise(resolve => { informacionsenescyt(cedulapostulante, (valor) => { resolve(valor); }) });
                    if (datosenescyt.identificacion != null) {
                        var nacionalidad = await new Promise(resolve => { verificacionregistro('nacionalidad', 'nac_nombre', datosenescyt.nacionalidad, 0, 0, (err, valor) => { resolve(valor); }) });
                        var genero = await new Promise(resolve => { verificacionregistro('genero', 'gen_nombre', datosenescyt.genero, 0, 0, (err, valor) => { resolve(valor); }) });
                        var estadocivil = await new Promise(resolve => { centralizada.obtenerregistroempiezaconunvalor('estadoCivil', 'eci_nombre', datosenescyt.estadoCivil, (err, valor) => { resolve(valor); }) });
                        var etnia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('etnia', 'etn_nombre', datosenescyt.autoidentificacion.substring(0, 3), (err, valor) => { resolve(valor); }) });
                        var idnacionalidad = 1
                        var idgenero = 3
                        var idestadocivil = 1
                        var idetnia = 8
                        if (nacionalidad.nac_id != null) {
                            idnacionalidad = nacionalidad.nac_id
                        }
                        if (genero.gen_id != null) {
                            idgenero = genero.gen_id
                        }
                        if ((estadocivil.length > 0) && (estadocivil != null)) {
                            idestadocivil = estadocivil[0].eci_id
                        }
                        if ((etnia.length > 0) && (etnia != null)) {
                            idetnia = etnia[0].etn_id
                        }
                        var fecha = formatDate(new Date())
                        //console.log("idnacionalidad: " + idnacionalidad + " idgenero: " + idgenero + " idestadocivil: " + idestadocivil + " idetnia: " + idetnia)
                        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(cedulapostulante, (err, valor) => { resolve(valor); }) });
                        if ((personacentralizada != null) && (personacentralizada.length > 0)) {
                            var actualizacionpersona = await new Promise(resolve => { centralizada.modificardatospersonaadmision(idgenero, idestadocivil, fecha, idetnia, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                            if (actualizacionpersona == true) {
                                var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(nacionalidad, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                console.log("Actualizado correctamente el registro de la persona: " + cedulapostulante)
                                cont = cont + 1
                            }
                        }
                        else {
                            console.log("No se encontro informacion en la centralizada del postulante: " + cedulapostulante)
                        }
                    }
                    else {
                        console.log("No se encontro informacion del senescyt del postulante: " + cedulapostulante)
                    }
                }
                console.log("Se realizaron " + cont + " actualizaciones")
                res.json(
                    {
                        success: true,
                        mensaje: "Se realizaron " + cont + "actualizaciones"
                    }
                )
            }
            else {
                console.log("No se encontro informacion de inscritos en admisiones")
                res.json(
                    {
                        success: false,
                        mensaje: "No se encontro informacion de inscritos en admisiones"
                    }
                )
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

//////FUNCIONES
async function obtenerdiasdeactualizacion(callback) {
    try {
        let listado = [];
        var numdias = await new Promise(resolve => { centralizada.obtenerdiasdeconfiguracion((err, valor) => { resolve(valor); }) });
        if (numdias.length > 0) {
            listado.push(numdias[0].valor);
        }
        else {
            return callback("X");
        }
        return callback(listado);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
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
async function verificacionregistro(tabla, nombrecampo, valor, idprovincia, idciudad, callback) {
    try {
        var objetobase = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo(tabla, nombrecampo, valor, (err, valor) => { resolve(valor); }) });
        if ((objetobase != null) && (objetobase.length > 0)) {
            if (objetobase.length > 1) {
                if (tabla == 'genero') {
                    return callback(null, objetobase[2])
                }
                else {
                    if (tabla == 'sexo') {
                        return callback(null, objetobase[3])
                    }
                    else {
                        if ((tabla == 'nacionalidad') && (objetobase.length > 10)) {
                            return callback(null, objetobase[1])
                        }
                        else {
                            return callback(null, objetobase[0])
                        }
                    }
                }
            }
            else {
                return callback(null, objetobase[0])
            }

        }
        else {
            if (tabla == 'nacionalidad') {
                var ingresonacionalidad = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'nac_nombre', 'nac_requiereVisaTrabajo', valor, false, (err, valor) => { resolve(valor); }) });
                if (ingresonacionalidad == true) {
                    var objnacionalidad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('nacionalidad', 'nac_nombre', valor, (err, valor) => { resolve(valor); }) });
                    return callback(null, objnacionalidad[0])
                }
            }
            else {
                if (tabla == 'genero') {
                    let text = valor;
                    let codgenero = text.substring(0, 3);
                    var ingresogenero = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'gen_codigo', 'gen_nombre', codgenero, valor, (err, valor) => { resolve(valor); }) });
                    if (ingresogenero == true) {
                        var objgenero = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('genero', 'gen_nombre', valor, (err, valor) => { resolve(valor); }) });
                        return callback(null, objgenero[0])
                    }
                }
                else {
                    if (tabla == 'provincia') {
                        var ingresoprovincia = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'pro_nombre', 'pai_id', valor, 6, (err, valor) => { resolve(valor); }) });
                        if (ingresoprovincia == true) {
                            var objprovincia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('provincia', 'pro_nombre', valor, (err, valor) => { resolve(valor); }) });
                            return callback(null, objprovincia[0])
                        }
                    }
                    else {
                        if (tabla == 'ciudad') {
                            var ingresociudad = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'ciu_nombre', 'pro_id', valor, idprovincia, (err, valor) => { resolve(valor); }) });
                            if (ingresociudad == true) {
                                var objciudad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('ciudad', 'ciu_nombre', valor, (err, valor) => { resolve(valor); }) });
                                return callback(null, objciudad[0])
                            }
                        }
                        else {
                            if (tabla == 'parroquia') {
                                var ingresoparroquia = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'prq_nombre', 'ciu_id', valor, idciudad, (err, valor) => { resolve(valor); }) });
                                if (ingresoparroquia == true) {
                                    var objparroquia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('parroquia', 'prq_nombre', valor, (err, valor) => { resolve(valor); }) });
                                    return callback(null, objparroquia[0])
                                }
                            }
                            else {
                                if (tabla == 'sexo') {
                                    var ingresosexo = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'sex_codigo', 'sex_nombre', valor.substring(0, 3), valor, (err, valor) => { resolve(valor); }) });
                                    if (ingresosexo == true) {
                                        var objsexo = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('sexo', 'sex_nombre', valor, (err, valor) => { resolve(valor); }) });
                                        return callback(null, objsexo[0])
                                    }
                                }
                                else {
                                    return callback(null)
                                }
                            }
                        }
                    }

                }
            }
        }
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

async function informacionsenescyt(cedula, callback) {
    try {
        let parametros = {};
        parametros = {
            strCedula: cedula
        }
        var request = require('request');
        request.post({
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "*/*",
                "Connection": "keep-alive",
                "Accept-Encoding": "gzip, deflate, br"
            },
            url: urlAcademico.urladmisionsenescyt + "registro_unico/verificar_cedula",
            body: parametros,
            rejectUnauthorized: false,
            json: true
        }, function (error, response, body) {
            return callback(body);
        });

    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
/* get de discapacidad */
router.get('/objpersonalizadodiscapacidad', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var personadiscapacitada = await new Promise(resolve => { centralizada.obtenerdiscapacidadpersonalizado((err, valor) => { resolve(valor); }) });
        if (personadiscapacitada.length > 0) {
            return res.json({
                success: true,
                listado: personadiscapacitada
            });
        }
        else {
            return res.json({
                success: true,
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
/* ************* */
module.exports = router;