const express = require('express');
const router = express.Router();
const Request = require("request");
const crypto = require('crypto');
const centralizada = require('./../modelo/centralizada');
const urlAcademico = require('../config/urlAcademico');
const soap = require('soap');

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
        if (personapersonalizada != null) {
            if (personapersonalizada.length > 0) {
                var procedenciapersona = personapersonalizada[0].per_procedencia;
                const myArray = procedenciapersona.split("|");
                if (myArray.length > 0) {
                    var provincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('provincia', 'pro_id', myArray[0], (err, valor) => { resolve(valor); }) });
                    if (provincia.length > 0) {
                        var ciudad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('ciudad', 'ciu_id', myArray[1], (err, valor) => { resolve(valor); }) });
                        if (ciudad.length > 0) {
                            var parroquia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('parroquia', 'prq_id', myArray[2], (err, valor) => { resolve(valor); }) });
                            if (parroquia.length > 0) {
                                var procedenciastring = provincia[0].pro_nombre + "/" + ciudad[0].ciu_nombre + "/" + parroquia[0].prq_nombre;
                                personapersonalizada[0].per_procedencia = procedenciastring;
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
                        return res.json({
                            success: false,
                            mensaje: 'No existen registros de provincia de la persona'
                        });
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
    var actualizacionpersona = await new Promise(resolve => { centralizada.modificardatospersona(jsonDataObj.per_emailAlternativo, jsonDataObj.per_telefonoCelular, jsonDataObj.per_telefonoCasa, jsonDataObj.lugarprocedencia_id, jsonDataObj.gen_id, jsonDataObj.per_id, fecha, jsonDataObj.etn_id, (err, valor) => { resolve(valor); }) });
    if (actualizacionpersona) {
        var actualizadireccion = await new Promise(resolve => { centralizada.modificardireccionpersona(jsonDataObj.dir_callePrincipal, jsonDataObj.per_id, jsonDataObj.idprqdireccion, (err, valor) => { resolve(valor); }) });
        if (actualizadireccion) {
            var objnacionalidad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('nacionalidad', 'nac_id', jsonDataObj.nac_id, (err, valor) => { resolve(valor); }) });
            if (objnacionalidad != null) {
                if (objnacionalidad.length > 0) {
                    var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(objnacionalidad[0], jsonDataObj.per_id, (err, valor) => { resolve(valor); }) });
                    if (actualizanacionalidad) {
                        console.log('persona actualizada con exito')
                        return res.json({
                            success: true,
                            listado: jsonDataObj
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
            return res.json({
                success: false,
                mensaje: 'Error en el registro de la tabla direccion',
                listado: []
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
        var fechadetalle = objpersona.usufechanac.split('/');
        var personamatriz = {};
        var nacionalidad = await new Promise(resolve => { verificacionregistro('nacionalidad', 'nac_nombre', objpersona.nacionalidad, 0, 0, (err, valor) => { resolve(valor); }) });
        var genero = await new Promise(resolve => { verificacionregistro('genero', 'gen_nombre', objpersona.genero, 0, 0, (err, valor) => { resolve(valor); }) });
        var estadocivil = await new Promise(resolve => { centralizada.obtenerregistroempiezaconunvalor('estadoCivil', 'eci_nombre', objpersona.estadocivil, (err, valor) => { resolve(valor); }) });
        var provincia = await new Promise(resolve => { verificacionregistro('provincia', 'pro_nombre', objpersona.provinciareside, 0, 0, (err, valor) => { resolve(valor); }) });
        var sexo = await new Promise(resolve => { verificacionregistro('sexo', 'sex_nombre', objpersona.sexo, 0, 0, (err, valor) => { resolve(valor); }) });
        var etnia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('etnia', 'etn_nombre', objpersona.autoidentificacion.substring(0, 3), (err, valor) => { resolve(valor); }) });
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
            etn_id: etnia[0].etn_id,
            eci_id: estadocivil[0].eci_id,
            gen_id: genero.gen_id,
            per_creadopor: 0,
            per_fechacreacion: formatDate(new Date()),
            per_modificadopor: 0,
            per_fechamodificacion: formatDate(new Date()),
            lugarprocedencia_id: parroquia.prq_id,
            sex_id: sexo.sex_id,
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
            console.log(objtipodiscapacidad[0])

        }
        var personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
        if ((personacentralizada == null) || (personacentralizada.length == 0)) {
            var registrarpersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(personamatriz, (err, valor) => { resolve(valor); }) });
            if (registrarpersona) {
                var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personamatriz.per_nombres, personamatriz.per_primerapellido, personamatriz.per_segundoapellido, personamatriz.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                if (persona.length > 0) {
                    var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(personamatriz.per_cedula, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                    if (documentopersonalreg) {
                        console.log('Documento personal registrado')
                    }
                    var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, nacionalidad.nac_requiereVisaTrabajo, nacionalidad.nac_id, (err, valor) => { resolve(valor); }) });
                    if (ingresoNacionalidad) {
                        console.log('Registro ingresado correctamente')
                    }
                }
            }
        }
        else {
            console.log('modificar los datos registrados')
            personacentralizada[0].admision = true;
            var actualizarpersona = await new Promise(resolve => { centralizada.modificarpersonacondatosmatriz(personamatriz, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
            if (actualizarpersona) {
                var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(nacionalidad, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if (actualizanacionalidad) {
                    console.log('Datos de la persona actualizados correctamente')
                }
            }
            if (blndiscapacidad) {
                var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if ((carnetdiscregistrado != null) || (carnetdiscregistrado.length > 0)) {
                    var discapacidadregistrada = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('discapacidad', 'cdi_id', carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                    if ((discapacidadregistrada != null) && (discapacidadregistrada.length > 0)) {
                        discapacidadregistrada.dis_valor = personamatriz.porcentajediscapacidad;
                        discapacidadregistrada.tdi_id = objtipodiscapacidad[0].tdi_id;
                        var discapacidadactualizada = await new Promise(resolve => { centralizada.actualizardiscapacidad(discapacidadregistrada.dis_valor, discapacidadregistrada.tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                        if (discapacidadactualizada) {
                            console.log('Discapacidad actualizada')
                        }
                    }
                    else {
                        ///registrar discapacidad
                        var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(personamatriz.porcentajediscapacidad, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                        if (discapacidadregistrada) {
                            console.log('Discapacidad registrada con carnet vigente')
                        }
                    }
                }
                else {
                    //registrar carnet y discapacidad
                    var carnetdis = await new Promise(resolve => { centralizada.ingresocarnetDiscapacidad(personamatriz.carnetconadis, 2, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                    if (carnetdis) {
                        console.log('carnet de discapacidad registrado')
                        var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                        var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(personamatriz.porcentajediscapacidad, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                        if (discapacidadregistrada) {
                            console.log('Discapacidad y carnet de discapacidad registrados')
                        }

                    }
                }
            }
        }
        personacentralizada = await new Promise(resolve => { centralizada.obtenerdatospersonaincluidodiscapacidad(objpersona.identificacion, (err, valor) => { resolve(valor); }) });
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
router.get('/verificarinstruccionformal/:idpersona', async (req, res) => {
    const idpersona = req.params.idpersona;
    let listacodigos = [];
    var listatitulosdinardap = [];
    var listatitulosregistrar = [];
    try {
        var documentopersonal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('documentoPersonal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
        if (documentopersonal != null) {
            var titulosdinardap = await new Promise(resolve => { serviciodinardapminEducacion(documentopersonal[0].pid_valor, (err, valor) => { resolve(valor); }) });
            var titulosdinardapsenescyt = await new Promise(resolve => { serviciodinardapsenescyt(documentopersonal[0].pid_valor, (err, valor) => { resolve(valor); }) });
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
            }
            var objinstruccionformal = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('instruccionFormal', 'per_id', idpersona, (err, valor) => { resolve(valor); }) });
            if (objinstruccionformal != null) {
                if (objinstruccionformal.length > 0) {
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
                        let titulosregistrados = [];
                        for (tituloregistrar of listatitulosregistrar) {
                            var registrotablainstruccion = await new Promise(resolve => { registrartitulocentralizada(tituloregistrar, idpersona, (err, valor) => { resolve(valor); }) });
                            if (registrotablainstruccion != null) {
                                titulosregistrados.push(registrotablainstruccion[0])
                                console.log('Titulo Registrado')
                            }
                        }
                    }
                    else {
                        return res.json({
                            success: true,
                            mensaje: 'registros centralizada',
                            listado: objinstruccionformal
                        });
                    }
                }
                else {
                    if (listatitulosdinardap.length == 0) {
                        ///// registrar los titulos en la centralizada
                    } else {
                        return res.json({
                            success: true,
                            mensaje: 'No existen títulos registrados de la persona en la Dinardap ni en la base centralizada',
                            listado: []
                        });
                    }

                }
            }
            else {
                if (listatitulosdinardap.length == 0) {
                    return res.json({
                        success: true,
                        mensaje: 'No existen títulos registrados de la persona en la Dinardap ni en la base centralizada',
                        listado: []
                    });
                }
                else {
                    ///registrar titulos dinardap
                }
            }
        }
        else {
            return res.json({
                success: true,
                mensaje: 'La persona no posee información en la base de datos centralizada',
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
function formatofechasinhora(date) {
    return (
        [
            date.getFullYear(),
            padTo2Digits(date.getMonth() + 1),
            padTo2Digits(date.getDate()),
        ].join('-')
    );
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
                        callback(null);
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
                callback(null);
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
                        callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listaregistrosdinardap = objjson.instituciones[0].detalle.items;
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
                callback(null);
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
        var titulos = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('titulo', 'tit_nombre', objtitulodinardap.titulo + ' ' + objtitulodinardap.especialidad, (err, valor) => { resolve(valor); }) });
        if (titulos == null) {
            //registrar titulo en la base de datos
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
        if (instituciones == null) {
            //registrar institución en la base de datos
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
        if (titulosacademicos == null) {
            // registrar titulo academico en la base de datos
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
        if (instruccionFormal == null) {
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
async function verificacionregistro(tabla, nombrecampo, valor, idprovincia, idciudad, callback) {
    try {
        var objetobase = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo(tabla, nombrecampo, valor, (err, valor) => { resolve(valor); }) });
        if ((objetobase != null) && (objetobase.length > 0)) {
            return callback(null, objetobase[0])
        }
        else {
            if (tabla == 'nacionalidad') {
                var ingresonacionalidad = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'nac_nombre', 'nac_requiereVisaTrabajo', valor, false, (err, valor) => { resolve(valor); }) });
                if (ingresonacionalidad) {
                    var objnacionalidad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('nacionalidad', 'nac_nombre', valor, (err, valor) => { resolve(valor); }) });
                    return callback(null, objnacionalidad[0])
                }
            }
            else {
                if (tabla == 'genero') {
                    let text = valor;
                    let codgenero = text.substring(0, 3);
                    var ingresogenero = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'gen_codigo', 'gen_nombre', codgenero, valor, (err, valor) => { resolve(valor); }) });
                    if (ingresogenero) {
                        var objgenero = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('genero', 'gen_nombre', valor, (err, valor) => { resolve(valor); }) });
                        return callback(null, objgenero[0])
                    }
                }
                else {
                    if (tabla == 'provincia') {
                        var ingresoprovincia = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'pro_nombre', 'pai_id', valor, 6, (err, valor) => { resolve(valor); }) });
                        if (ingresoprovincia) {
                            var objprovincia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('provincia', 'pro_nombre', valor, (err, valor) => { resolve(valor); }) });
                            return callback(null, objprovincia[0])
                        }
                    }
                    else {
                        if (tabla == 'ciudad') {
                            var ingresociudad = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'ciu_nombre', 'pro_id', valor, idprovincia, (err, valor) => { resolve(valor); }) });
                            if (ingresociudad) {
                                var objciudad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('ciudad', 'ciu_nombre', valor, (err, valor) => { resolve(valor); }) });
                                return callback(null, objciudad[0])
                            }
                        }
                        else {
                            if (tabla == 'parroquia') {
                                var ingresoparroquia = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'prq_nombre', 'ciu_id', valor, idciudad, (err, valor) => { resolve(valor); }) });
                                if (ingresoparroquia) {
                                    var objparroquia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('parroquia', 'prq_nombre', valor, (err, valor) => { resolve(valor); }) });
                                    return callback(null, objparroquia[0])
                                }
                            }
                            else {
                                if (tabla == 'sexo') {
                                    var ingresosexo = await new Promise(resolve => { centralizada.ingresotablacon2campos(tabla, 'sex_codigo', 'sex_nombre', valor.substring(0, 3), valor, (err, valor) => { resolve(valor); }) });
                                    if (ingresosexo) {
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
module.exports = router;