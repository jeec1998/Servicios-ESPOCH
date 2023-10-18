const express = require("express");
const jwt = require("jsonwebtoken");
const acceso = require('./../modelo/acceso');
const app = express();
const router = express.Router();
const jwt_decode = require('jwt-decode');
const PdfkitConstruct = require("pdfkit-construct");
const fs = require("fs");
const { Base64Encode } = require('base64-stream');
const { Console } = require('console');
const centralizada = require('./../modelo/centralizada');
//const { password } = require("./../config/database");
const crypto = require('crypto');
const nomenclatura = require('./../config/nomenclatura');
const pathimage = require('path');


router.post('/seguridad/accesows', function (req, res) {
    try {
        var token = req.headers['authorization'];
        if (!token) {
            res.status(401).send({
                error: 'No se encontro Token',
            })
        }
        token = token.replace('Basic ', '')
        const base64 = token;
        const buff = Buffer.from(base64, 'base64');
        const str = buff.toString('utf-8');
        let decodificado = str.replace('keydtic:', '');
        const buff2 = Buffer.from(decodificado, 'base64');
        const str2 = buff2.toString('utf-8');
        generartokenparainiciar(req.body.username, req.body.passwoord, req.body.id, str2, function (data, token) {
            if (token == "") {
                return res.json({
                    success: false,
                    mensaje: data,
                    acceso: ""
                });
            }
            else {
                return res.json({
                    success: true,
                    mensaje: "",
                    acceso: token
                });
            }

        });
    } catch (err) {
        return res.json({
            success: false,
            respuesta: "Problemas en sus credenciales"
        });
    }

});


async function generartokenparainiciar(username, passwoord, id, key, callback, token) {
    var respuesta = "";
    try {
        var verificarkeyd = await new Promise(resolve => { acceso.verificarkey(key, (err, valor) => { resolve(valor.recordset); }) });
        if (verificarkeyd.length > 0) {
            let myString = passwoord;
            let hashHex = crypto.createHash('sha512').update(myString).digest('hex');
            var validarusuarioa = await new Promise(resolve => { acceso.validarusuariocondatos(username, hashHex, (err, valor) => { resolve(valor.recordset); }) });
            if (validarusuarioa.length > 0) {
                var tarertokengenerados = await new Promise(resolve => { acceso.traertokengenerados(id, (err, valor) => { resolve(valor.recordset); }) });
                if (tarertokengenerados.length > 0) {
                    var verificartokens = await new Promise(resolve => { acceso.verificartoken(username, hashHex, id, (err, valor) => { resolve(valor.recordset); }) });
                    if (verificartokens.length > 0) {
                        if (verificartokens[0].estadosesion == 1) {
                            return callback("SESION ACTIVA", "");
                        }
                    }
                    else {
                        var tokengenerado = await new Promise(resolve => { generartoken(username, passwoord, id, key, hashHex, validarusuarioa[0].credependencia, (err, valor) => { resolve(valor); }) });
                        if (tokengenerado == null) {
                            return callback("ERROR - TOKEN NO GENERADO", "");
                        }
                        else {
                            var ingresar = await new Promise(resolve => { acceso.insertartoken(verificarkeyd[0].creid, id, tokengenerado, 1, 1, (err, valor) => { resolve(valor); }) });
                            if (ingresar == true) {
                                return callback("", tokengenerado);
                            }
                            else {
                                return callback("ERROR - " + ingresar, "");
                            }
                        }


                    }
                }
                else {
                    var tokengenerado = await new Promise(resolve => { generartoken(username, passwoord, id, key, hashHex, validarusuarioa[0].credependencia, (err, valor) => { resolve(valor); }) });
                    var ingresar = await new Promise(resolve => { acceso.insertartoken(verificarkeyd[0].creid, id, tokengenerado, 1, 1, (err, valor) => { resolve(valor); }) });
                    if (ingresar == true) {
                        return callback("", tokengenerado);
                    }
                    else {
                        return callback("ERROR - " + ingresar, "");
                    }
                }
            }
            else {
                return callback("ERROR - CREDENCIALES INCORRECTAS", "");
            }


        }
        else {
            return callback("ERROR - KEY INVÁLIDO ", "");
        }

    } catch (err) {
        console.log('Error: ' + err)
        return callback("ERROR");
    }
}


async function generartoken(username, passwoord, id, key, hashHex, credependencia, callback, token) {
    var respuesta = "";
    try {
        jwt.sign({ userconsumo: id, dependecia: credependencia, sub: "seguridaDtic" }, key, { algorithm: "HS512", expiresIn: '24h' }, (err, token) => {
            return callback(null, token);
        });

    } catch (err) {
        console.log('Error: ' + err)
        return callback("Error" + err, "");
    }
}


router.post('/seguridad/cierresession', function (req, res) {
    try {
        var token = req.headers['authorization'];
        if (!token) {
            res.status(401).send({
                error: 'No se encontro Token',
            })
        }
        token = token.replace('Basic ', '')
        const base64 = token;
        const buff = Buffer.from(base64, 'base64');
        const str = buff.toString('utf-8');
        let decodificado = str.replace('keydtic:', '');
        const buff2 = Buffer.from(decodificado, 'base64');
        const str2 = buff2.toString('utf-8');
        cierresession(req.body.username, req.body.passwoord, req.body.id, str2, function (data, token) {
            if (token == "") {
                return res.json({
                    success: false,
                    mensaje: data,
                    acceso: ""
                });
            }
            else {
                return res.json({
                    success: true,
                    mensaje: "",
                    acceso: token
                });
            }

        });
    } catch (err) {
        return res.json({
            success: false,
            respuesta: "Problemas en sus credenciales"
        });
    }

});


async function cierresession(username, passwoord, id, key, callback, token) {
    var respuesta = "";
    try {
        var verificarkeyd = await new Promise(resolve => { acceso.verificarkey(key, (err, valor) => { resolve(valor.recordset); }) });
        if (verificarkeyd.length > 0) {
            let myString = passwoord;
            let hashHex = crypto.createHash('sha512').update(myString).digest('hex');
            var validarusuarioa = await new Promise(resolve => { acceso.validarusuariocondatos(username, hashHex, (err, valor) => { resolve(valor.recordset); }) });
            if (validarusuarioa.length > 0) {
                var tarertokengenerados = await new Promise(resolve => { acceso.traertokengenerados(id, (err, valor) => { resolve(valor.recordset); }) });
                if (tarertokengenerados.length > 0) {
                    var verificartokens = await new Promise(resolve => { acceso.verificartoken(username, hashHex, id, (err, valor) => { resolve(valor.recordset); }) });
                    if (verificartokens.length > 0) {
                        var ingresar = await new Promise(resolve => { acceso.modificartoken(id, 2, 2, (err, valor) => { resolve(valor); }) });
                        if (ingresar == true) {
                            return callback("", "Cierre Sesion Exitoso");
                        }
                        else {
                            var eliminartoken = await new Promise(resolve => { acceso.deletetokendeproblemas(id, (err, valor) => { resolve(valor); }) });
                            if (eliminartoken == true) {
                                return callback("", "Cierre Sesion Exitoso");
                            }
                            else {
                                return callback("ERROR - " + eliminartoken, "");
                            }
                        }
                    }
                    else {
                        return callback("", "No existe Ninguna sesión Activa");
                    }
                }
                else {
                    return callback("", "Cierre Sesion Exitoso");
                }
            }
            else {
                return callback("ERROR - CREDENCIALES INCORRECTAS", "");
            }

        }
        else {
            return callback("ERROR - KEY INVÁLIDO ", "");
        }

    } catch (err) {
        console.log('Error: ' + err)
        return callback("ERROR");
    }
}


router.post('/seguridad/obtenerkey', function (req, res) {
    try {
        obtenerkey(req.body.username, req.body.passwoord, function (data, token) {
            if (token == "") {
                return res.json({
                    success: false,
                    mensaje: data,
                    key: ""
                });
            }
            else {
                return res.json({
                    success: true,
                    mensaje: "",
                    key: token
                });
            }

        });
    } catch (err) {
        return res.json({
            success: false,
            respuesta: "Problemas en sus credenciales"
        });
    }

});


async function obtenerkey(username, passwoord, callback, token) {
    var respuesta = "";
    try {

        let myString = passwoord;
        let hashHex = crypto.createHash('sha512').update(myString).digest('hex');
        var validarusuarioa = await new Promise(resolve => { acceso.validarusuariocondatos(username, hashHex, (err, valor) => { resolve(valor.recordset); }) });
        if (validarusuarioa.length > 0) {
            const str = validarusuarioa[0].crekey;
            const buff = Buffer.from(str, 'utf-8');
            const base64 = buff.toString('base64');
            return callback("", base64);
        }
        else {
            return callback("ERROR - CREDENCIALES INCORRECTAS", "");
        }

    } catch (err) {
        console.log('Error: ' + err)
        return callback("ERROR");
    }
}





router.get('/seguridad/Listarubicaciondadoid/:perid/:rolid', (req, res) => {
    const perid = req.params.perid;
    const rolid = req.params.rolid;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    Listarubicaciondadoid(perid, rolid, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function Listarubicaciondadoid(perid1, rolid1, callback) {
    try {
        let listado = [];

        var personaubicacion = await new Promise(resolve => { administracion.obtenerpersonaubicacion(perid1, rolid1, (err, valor) => { resolve(valor.recordset); }) });
        if (personaubicacion.length > 0) {
            for (var objexamenes of personaubicacion) {
                var persona = await new Promise(resolve => { administracion.obtenerpersonadadoid(perid1, (err, valor) => { resolve(valor.recordset); }) });
                if (persona.length > 0) {
                    var rol = await new Promise(resolve => { administracion.obtenerrolesdadoid(rolid1, (err, valor) => { resolve(valor.recordset); }) });
                    if (rol.length > 0) {
                        let idrol = {
                            rolDescripcion: rol[0].rolDescripcion,
                            rolEstado: rol[0].rolEstado,
                            rolIcono: rol[0].rolIcono,
                            rolId: rol[0].rolId,
                            rolMetodo: rol[0].rolMetodo,
                            rolNombre: rol[0].rolNombre,
                        }
                        let perid = {
                            perApellidos: persona[0].perApellidos,
                            perCedula: persona[0].perCedula,
                            perEmail: persona[0].perEmail,
                            perEstado: persona[0].perEstado,
                            perId: persona[0].perId,
                            perNombres: persona[0].perNombres,
                        }
                        let listadentro = {
                            idrol: idrol,
                            perid: perid,
                            personaubicacion: objexamenes

                        }
                        //    listado.push(idrol);
                        listado.push(listadentro);

                    }
                    else {
                        return callback("");
                    }
                }
                else {
                    return callback("");
                }


            }
            return callback(listado);

        }
        else {
            return callback("");
        }
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}


router.get('/seguridad/Listarolesdadoidpersona/:perid', (req, res) => {
    const perid = req.params.perid;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    Listarolesdadoidpersona(perid, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function Listarolesdadoidpersona(perid1, callback) {
    try {
        let listado = [];

        var personaubicacion = await new Promise(resolve => { administracion.obtenerpersonaroldadoidpersona(perid1, (err, valor) => { resolve(valor.recordset); }) });
        if (personaubicacion.length > 0) {
            for (var objexamenes of personaubicacion) {
                var persona = await new Promise(resolve => { administracion.obtenerpersonadadoid(objexamenes.per_id, (err, valor) => { resolve(valor.recordset); }) });
                if (persona.length > 0) {
                    var rol = await new Promise(resolve => { administracion.obtenerrolesdadoid(objexamenes.rol_id, (err, valor) => { resolve(valor.recordset); }) });
                    if (rol.length > 0) {
                        let idrol = {
                            rolDescripcion: rol[0].rolDescripcion,
                            rolEstado: rol[0].rolEstado,
                            rolIcono: rol[0].rolIcono,
                            rolId: rol[0].rolId,
                            rolMetodo: rol[0].rolMetodo,
                            rolNombre: rol[0].rolNombre,
                        }
                        let perid = {
                            perApellidos: persona[0].perApellidos,
                            perCedula: persona[0].perCedula,
                            perEmail: persona[0].perEmail,
                            perEstado: persona[0].perEstado,
                            perId: persona[0].perId,
                            perNombres: persona[0].perNombres,
                        }
                        let personarolPK = {
                            perId: persona[0].perId,
                            rolId: rol[0].rolId,
                        }
                        let listadentro = {
                            persona: perid,
                            personarolPK: personarolPK,
                            prolDependencia: objexamenes.prolDependencia,
                            prolEstado: objexamenes.prolEstado,
                            roles: idrol
                        }
                        //    listado.push(idrol);
                        listado.push(listadentro);

                    }
                    else {
                        return callback("");
                    }
                }
                else {
                    return callback("");
                }


            }
            return callback(listado);

        }
        else {
            return callback("");
        }
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}



router.get('/seguridad/Listarubicaciondadoidctivas/:perid/:rolid', (req, res) => {
    const perid = req.params.perid;
    const rolid = req.params.rolid;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    Listarubicaciondadoidctivas(perid, rolid, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function Listarubicaciondadoidctivas(perid1, rolid1, callback) {
    try {
        let listado = [];

        var personaubicacion = await new Promise(resolve => { administracion.obtenerpersonaubicacion(perid1, rolid1, (err, valor) => { resolve(valor.recordset); }) });
        if (personaubicacion.length > 0) {
            for (var objexamenes of personaubicacion) {
                var persona = await new Promise(resolve => { administracion.obtenerpersonadadoid(perid1, (err, valor) => { resolve(valor.recordset); }) });
                if (persona.length > 0) {
                    var rol = await new Promise(resolve => { administracion.obtenerrolesdadoid(rolid1, (err, valor) => { resolve(valor.recordset); }) });
                    if (rol.length > 0) {
                        let idrol = {
                            rolDescripcion: rol[0].rolDescripcion,
                            rolEstado: rol[0].rolEstado,
                            rolIcono: rol[0].rolIcono,
                            rolId: rol[0].rolId,
                            rolMetodo: rol[0].rolMetodo,
                            rolNombre: rol[0].rolNombre,
                        }
                        let perid = {
                            perApellidos: persona[0].perApellidos,
                            perCedula: persona[0].perCedula,
                            perEmail: persona[0].perEmail,
                            perEstado: persona[0].perEstado,
                            perId: persona[0].perId,
                            perNombres: persona[0].perNombres,
                        }
                        let listadentro = {
                            idrol: idrol,
                            perid: perid,
                            dtfechacreacion: objexamenes.dtfechacreacion,
                            intestado: objexamenes.intestado,
                            intid: objexamenes.intid,
                            strbasedatos: objexamenes.strbasedatos,
                            strcarrera: objexamenes.strcarrera,
                            strcarreraunica: objexamenes.strcarreraunica,
                            strcodcarrera: objexamenes.strcodcarrera,
                            strcodfacultad: objexamenes.strcodfacultad,
                            strfacultad: objexamenes.strfacultad,
                            strsede: objexamenes.strsede,
                        }
                        if (objexamenes.intestado == 1) {
                            listado.push(listadentro);

                        }

                    }
                    else {
                        return callback("");
                    }
                }
                else {
                    return callback("");
                }


            }
            return callback(listado);

        }
        else {
            return callback("");
        }
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}


router.get('/seguridad/obtenerdependenciadadoid/:perid', (req, res) => {
    const perid = req.params.perid;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    obtenerdependenciadadoid(perid, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});



async function obtenerdependenciadadoid(perid1, callback) {
    let listado = [];
    try {
        var Request = require("request");
        var fs = require('fs');
        var http = require('http');
        var https = require('https');
        var cer1 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec.key')
        var cer2 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec_2023.crt')
        var cer3 = pathimage.join(__dirname, '../Certificados/espoch_edu_ec_ca.crt')
        Request.get({
            rejectUnauthorized: false,
            url: nomenclatura.urldependenciadadoid + perid1,
            json: true
        }, function (error, response, body) {
            listado.push(body)
            return callback(listado);
        });

    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}


router.get('/seguridad/ListarOpciocesdadoIdPadreactivos/:IdUsuario/:idPadre', (req, res) => {
    const IdUsuario = req.params.IdUsuario;
    const idPadre = req.params.idPadre;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    ListarOpciocesdadoIdPadreactivos(IdUsuario, idPadre, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function ListarOpciocesdadoIdPadreactivos(perid1, padre, callback) {
    try {
        let listado = [];
        var persona = await new Promise(resolve => { administracion.obtenerrolesdadopadreyusuario(padre, perid1, (err, valor) => { resolve(valor.recordset); }) });
        for (var objexamenes of persona) {
            if (persona.length > 0) {
                let opciones = {
                    opcDescripcion: objexamenes.opc_descripcion,
                    opcEstado: objexamenes.opc_estado,
                    opcIcono: objexamenes.opc_icono,
                    opcId: objexamenes.opc_id,
                    opcMetodo: objexamenes.opc_nombre,
                    opcNombre: objexamenes.perNombres,
                    opcUrl: objexamenes.opc_url,
                }
                let listadentro = {
                    opciones: opciones,

                    rolopEliminar: objexamenes.rolop_eliminar,
                    rolopEstado: objexamenes.rolop_estado,
                    rolopInsertar: objexamenes.rolop_insertar,
                    rolopModificar: objexamenes.rolop_modificar,
                }
                listado.push(listadentro);

            }
            else {
                return callback("");
            }
        }


        return callback(listado);

    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}



router.get('/seguridad/Listarpadreopciondadorol/:Idrol', (req, res) => {
    const Idrol = req.params.Idrol;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    Listarpadreopciondadorol(Idrol, function (Resultado) {
                        if (Resultado.length > 0) {
                            return res.json({
                                success: true,
                                listado: Resultado
                            });
                        } else {
                            return res.json({
                                success: true,
                                listado: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function Listarpadreopciondadorol(Idrol, callback) {
    try {
        let listado = [];
        var persona = await new Promise(resolve => { administracion.Listarpadreopciondadorol(Idrol, (err, valor) => { resolve(valor.recordset); }) });
        for (var objexamenes of persona) {
            if (persona.length > 0) {
                let opciones = {
                    padoEstado: objexamenes.pado_estado,
                    padoIcono: objexamenes.pado_icono,
                    padoId: objexamenes.pado_id,
                    padoNombre: objexamenes.pado_nombre
                }
                listado.push(opciones);
            }
            else {
                return callback("");
            }
        }
        return callback(listado);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}



router.get('/seguridad/obtenerdatoscedulacentral/:cedula', (req, res) => {
    const cedula = req.params.cedula;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    obtenerdatoscedulacentral(cedula, function (Resultado) {
                        if (Resultado.length > 0) {
                            if (Resultado[0] == 'X') {
                                return res.json({
                                    success: true,
                                    datos: ""
                                });
                            }
                            else {
                                return res.json({
                                    success: true,
                                    datos: Resultado[0]
                                });
                            }
                        } else {
                            return res.json({
                                success: true,
                                datos: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});



router.get('/seguridad/obtenerdatoscedulacentralbd/:cedula', (req, res) => {
    const cedula = req.params.cedula;
    try {
        obtenerdatoscedulacentral(cedula, function (Resultado) {
            if (Resultado.length > 0) {
                if (Resultado[0] == 'X') {
                    return res.json({
                        success: true,
                        datos: ""
                    });
                }
                else {
                    return res.json({
                        success: true,
                        datos: Resultado[0]
                    });
                }
            } else {
                return res.json({
                    success: true,
                    datos: false
                });
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            estado: false,
            mensaje: 'Error:' + err
        });
    }
});

async function obtenerdatoscedulacentral(Idrol, callback) {
    try {
        let listado = [];
        var persona = await new Promise(resolve => { centralizada.obtenerdocumento(Idrol, (err, valor) => { resolve(valor); }) });
        if (persona.length > 0) {
            listado.push(persona[0]);
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





router.get('/seguridad/obtenerdatosmailcentral/:mail', (req, res) => {
    const mail = req.params.mail;
    var token = req.headers['authorization'];
    if (!token) {
        res.status(401).send({
            error: 'No se encontro Token',
        })
    }
    token = token.replace('Bearer ', '')
    var decoded = jwt_decode(token);
    var date = new Date(decoded.exp * 1000);
    let now = new Date();
    if (date.getTime() > now.getTime()) {
        usuario.validartoken(token, decoded.userconsumo, (err, valor) => {
            if (valor.recordset.length == 0) {
                return res.json({
                    success: false,
                    error: 'Token Invalido',
                });
            } else {
                try {
                    obtenerdatosmailcentral(mail, function (Resultado) {
                        if (Resultado.length > 0) {
                            if (Resultado[0] == 'X') {
                                return res.json({
                                    success: true,
                                    datos: ""
                                });
                            }
                            else {
                                return res.json({
                                    success: true,
                                    datos: Resultado[0]
                                });
                            }
                        } else {
                            return res.json({
                                success: true,
                                datos: false
                            });
                        }
                    });
                } catch (err) {
                    console.log('Error: ' + err)
                    return res.json({
                        estado: false,
                        mensaje: 'Error:' + err
                    });
                }
            }
        });
    }
    else {
        res.json({
            success: false,
            error: 'Token Expirado',
        });
    }
});


async function obtenerdatosmailcentral(mail, callback) {
    try {
        let listado = [];
        var persona = await new Promise(resolve => { centralizada.obtenerdocumentopormail(mail, (err, valor) => { resolve(valor); }) });
        if (persona.length > 0) {
            listado.push(persona[0]);
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


router.post('/seguridad/TokenJson', function (req, res) {
    try {
        TokenJson(req.body.token, function (data) {
            return res.json({
                success: true,
                palabra: data
            });
        });
    }
    catch (err) {
        console.log('Error: ' + err)
    }
});

async function TokenJson(palabra, callback) {
    var respuesta = "";
    try {
        var secret_key = 'fd85b494-aaaa';
        var secret_iv = 'smslt';
        var encryptionMethod = 'AES-256-CBC';
        var key = crypto.createHash('sha512').update(secret_key, 'utf-8').digest('hex').substr(0, 32);
        var iv = crypto.createHash('sha512').update(secret_iv, 'utf-8').digest('hex').substr(0, 16);
        var encryptedMessage = encrypt_string(JSON.stringify(palabra), encryptionMethod, key, iv);
        return callback(encryptedMessage);
    } catch (err) {
        console.log('Error: ' + err)
        return callback(false);
    }
}

function encrypt_string(plain_text, encryptionMethod, secret_key, iv) {
    var encryptor = crypto.createCipheriv(encryptionMethod, secret_key, iv);
    var aes_encrypted = encryptor.update(plain_text, 'utf8', 'base64') + encryptor.final('base64');
    return Buffer.from(aes_encrypted).toString('base64');
};


router.post('/seguridad/DecoToken', function (req, res) {
    try {
        DecoToken(req.body.token, function (data) {
            return res.json({
                success: true,
                Usuario: JSON.parse(data)
            });
        });

    } catch (err) {
        console.log('Error: ' + err)
    }
});

async function DecoToken(palabra, callback) {
    var respuesta = "";
    try {
        var secret_key = 'fd85b494-aaaa';
        var secret_iv = 'smslt';
        var encryptionMethod = 'AES-256-CBC';
        var key = crypto.createHash('sha512').update(secret_key, 'utf-8').digest('hex').substr(0, 32);
        var iv = crypto.createHash('sha512').update(secret_iv, 'utf-8').digest('hex').substr(0, 16);
        var encryptedMessage = decrypt_string(palabra, encryptionMethod, key, iv);
        return callback(encryptedMessage);
    } catch (err) {
        console.log('Error: ' + err)
        return callback(false);
    }
}

function encrypt_string(plain_text, encryptionMethod, secret_key, iv) {
    var encryptor = crypto.createCipheriv(encryptionMethod, secret_key, iv);
    var aes_encrypted = encryptor.update(plain_text, 'utf8', 'base64') + encryptor.final('base64');
    return Buffer.from(aes_encrypted).toString('base64');
};
function decrypt_string(encryptedMessage, encryptionMethod, secret_key, iv) {
    const buff = Buffer.from(encryptedMessage, 'base64');
    encryptedMessage = buff.toString('utf-8');
    var decryptor = crypto.createDecipheriv(encryptionMethod, secret_key, iv);
    return decryptor.update(encryptedMessage, 'base64', 'utf8') + decryptor.final('utf8');
};




router.get('/seguridad/ValidateCas/:cadena', (req, res) => {
    const cadena = req.params.cadena;
    try {
        validateCas(cadena, function (Resultado) {
            console.log(Resultado)
            if (Resultado.length > 0) {
                return res.send(
                    Resultado
                );
            } else {
                return res.json({
                    success: true,
                    listado: false
                });
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            estado: false,
            mensaje: 'Error:' + err
        });
    }
});

async function validateCas(cadena, callback) {
    let listado = [];
    try {
        var Request = require("request");
        var fs = require('fs');
        var http = require('http');
        var https = require('https');
        var cer1 = pathimage.join(__dirname, '../Certificados/espoch_sectigo_key_2019.key')
        var cer2 = pathimage.join(__dirname, '../Certificados/STAR_espoch_edu_ec.crt')
        var cer3 = pathimage.join(__dirname, '../Certificados/STAR_espoch_edu_ec.crt')
        Request.get({
            rejectUnauthorized: false,
            url: "https://seguridad.espoch.edu.ec/cas/p3/serviceValidate?" + cadena,
            json: true
        }, function (error, response, body) {
            listado.push(body)
            return callback(body);
        });

    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}

router.get('/seguridad/obtenerdatoscedulacentralbddadoid/:id', (req, res) => {
    const id = req.params.id;
    try {
        obtenerdatoscedulacentralbddadoid(id, function (Resultado) {
            if (Resultado.length > 0) {
                if (Resultado[0] == 'X') {
                    return res.json({
                        success: true,
                        datos: ""
                    });
                }
                else {
                    return res.json({
                        success: true,
                        datos: Resultado[0]
                    });
                }
            } else {
                return res.json({
                    success: true,
                    datos: false
                });
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            estado: false,
            mensaje: 'Error:' + err
        });
    }
});

async function obtenerdatoscedulacentralbddadoid(Idrol, callback) {
    try {
        let listado = [];
        var persona = await new Promise(resolve => { centralizada.obtenerdocumentoporperid(Idrol, (err, valor) => { resolve(valor); }) });
        if (persona.length > 0) {
            listado.push(persona[0]);
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



router.get('/pruebacontrasenia/:cedula/:pw', (req, res) => {
    const cedula = req.params.cedula;
    const pw = req.params.pw;
    try {
        pruebacontrasenia(cedula, pw, function (Resultado) {
            if (Resultado.length > 0) {
                return res.json({
                    success: true,
                    listado: Resultado
                });
            } else {
                return res.json({
                    success: true,
                    listado: false
                });
            }
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            estado: false,
            mensaje: 'Error:' + err
        });
    }
});


async function pruebacontrasenia(cedula, pw, callback) {
    try {
        const hash = require('sha1prng');
        const secretKey = 'xxxxxxxxxxxxxxxx';
        const hashKey = hash.sha1prng(secretKey);

        const buff = Buffer.alloc(8);
        console.log('Bufferssss:', buff);


        console.log('Buffer:', hashKey);
        console.log('Hex:', hashKey.toString('hex'));





        var secureRandom = require('secure-random')
        var bytes = secureRandom(8, { type: 'Buffer' }) //return a Buffer of 10 bytes
        console.log('dddddddddddddddd' + bytes.length) //10
        /////otro metrodo

        let myString = pw;
        let hashHex = crypto.createHash('sha512').update(myString).digest('hex');

        console.log('myString:', hashHex);
        const ddddsds = Buffer.from(hashHex.toString('utf-8'), 'base64');
        console.log('ddddsds:', ddddsds);
        const str = ddddsds.toString('utf-8');
        console.log('str:', str);
        console.log('Hex:', hashHex.toString('base64'));



       // const crypto = require("crypto")

        // Defining the algorithm
        let algorithm = "sha512"
        
        // Defining the key
        let key = "0603519372"
        
        // Creating the digest in hex encoding
        let digest1 = crypto.createHash(algorithm).update(key).digest("hex")
        
        // Creating the digest in base64 encoding
        let digest2 = crypto.createHash(algorithm).update(key).digest("base64")
        
        // Printing the digests
        console.log("In hex Encoding : \n " + digest1 + "\n")
        console.log("In base64 encoding: \n " + digest2)


    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        console.log('Error: ' + err)
        return callback(false);
    }
}

module.exports = router;