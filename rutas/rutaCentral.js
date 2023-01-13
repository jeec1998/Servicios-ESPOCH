const express = require('express');
const router = express.Router();
const Request = require("request");
const crypto = require('crypto');
const centralizada = require('./../modelo/centralizada');


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
        console.log(ciudades)
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
        console.log(cedula)
        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonapersonalizado(cedula, (err, valor) => { resolve(valor); }) });
        if (personapersonalizada != null) {
            if (personapersonalizada.length > 0) {
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
    var fecha= formatDate(new Date());
    var actualizacionpersona = await new Promise(resolve => { centralizada.modificardatospersona(jsonDataObj.per_emailAlternativo, jsonDataObj.per_telefonoCelular, jsonDataObj.per_telefonoCasa, jsonDataObj.lugarprocedencia_id, jsonDataObj.gen_id, jsonDataObj.per_id, fecha, jsonDataObj.etn_id, (err, valor) => { resolve(valor); }) });
    if (actualizacionpersona) {
        var actualizadireccion = await new Promise(resolve => { centralizada.modificardireccionpersona(jsonDataObj.dir_callePrincipal, jsonDataObj.per_id, jsonDataObj.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
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
                            success: true,
                            listado: []
                        });
                    }
                }
                else {
                    return res.json({
                        success: true,
                        listado: []
                    });
                }
            }
            else {
                return res.json({
                    success: true,
                    listado: []
                });
            }
        }
        else {
            return res.json({
                success: true,
                listado: []
            });
        }
    }
    else {
        return res.json({
            success: true,
            listado: []
        });
    }
});


router.get('/verificarpersonanacionalidad/:idpersona/:idnacionalidad', async (req, res) => {
    const idciudad = req.params.idciudad;
    const idnacionalidad = req.params.idnacionalidad;
    try {
        var objnacionalidad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('nacionalidad', 'nac_id', idnacionalidad, (err, valor) => { resolve(valor); }) });
        if (objnacionalidad != null) {
            if (objnacionalidad.length > 0) {
                var nacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersona(objnacionalidad[0], 95464, (err, valor) => { resolve(valor); }) });
                if (nacionalidad.length > 0) {
                    return res.json({
                        success: true,
                        listado: nacionalidad
                    });
                }
                else {
                    return res.json({
                        success: true,
                        listado: []
                    });
                }
            }
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

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