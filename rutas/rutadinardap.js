const { ejecutarConsultaSQLcontransacion } = require("./../config/ejecucion.js");
const { Pool } = require("pg");
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
const administracion = require('../modelo/administracion');
const sql = require('mssql');
const e = require('express');
const base64 = require('base64-js');
const ExcelJS = require('exceljs');
const bd = require("../config/baseMaster");
var cron = require('node-cron');

router.get('/obtenerpersona/:cedula', async (req, res) => {
    var cedula = req.params.cedula;
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
            if ((cedula.length == 10) || (cedula.length == 13)) {
                var registraruc = false;
                tipo = 2;
                if (cedula.length == 13) {
                    registraruc = true;
                    cedula = cedula.substring(0, 10);
                }
                var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                    if (registraruc == true) {
                        var ruc = cedula + '001';
                        var rucreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(ruc, 2, personapersonalizada[0].per_id, true, (err, valor) => { resolve(valor); }) });
                        if (rucreg == true) {
                            personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(ruc, (err, valor) => { resolve(valor); }) });
                        }
                        else {
                            return res.json({
                                success: false,
                                mensaje: 'Error al registrar el ruc de la persona'
                            });
                        }
                    }
                } else {
                    var registrar = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                    if (registrar != null) {
                        personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                        if (registraruc == true) {
                            var ruc = cedula + '001';
                            var rucreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(ruc, 2, personapersonalizada[0].per_id, true, (err, valor) => { resolve(valor); }) });
                            if (rucreg == true) {
                                personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(ruc, (err, valor) => { resolve(valor); }) });
                            }
                            else {
                                return res.json({
                                    success: false,
                                    mensaje: 'Error al registrar el ruc de la persona'
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
                return res.json({
                    success: true,
                    listado: personapersonalizada
                });
            }
            else {
                return res.json({
                    success: false,
                    mensaje: 'Cédula o Documento incorrecto'
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
            var estructuranombres = await new Promise(resolve => { actualizaciondenombrescentral(nombrepersona, (err, valor) => { resolve(valor); }) });
            console.log('Apellidos y nombres: ' + estructuranombres)
            return res.json({
                success: true,
                nombrePersona: estructuranombres
            });
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

router.get('/buscarTituloBachiller/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var listatitulos = [];


        var titulosdinardap = await new Promise(resolve => { serviciodinardapminEducacion(cedula, (err, valor) => { resolve(valor); }) });
        if (titulosdinardap != null) {
            listatitulos = titulosdinardap;
        }
        return res.json({
            success: true,
            listado: listatitulos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/verificartitulotercernivel/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var listatitulos = [];
    var success = false;
    try {
        var titulosdinardap = await new Promise(resolve => { verificartitulostercernivel(cedula, (err, valor) => { resolve(valor); }) });
        if (titulosdinardap != null) {
            listatitulos = titulosdinardap;
            success = true;
        }
        return res.json({
            success: success,
            listado: listatitulos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/informacionregistrocivil/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var informacionreg = [];
    var success = false;
    try {
        var datosregistro = await new Promise(resolve => { consumoinformacionregcivil(cedula, (err, valor) => { resolve(valor); }) });
        if (datosregistro != null) {
            informacionreg = datosregistro;
            success = true;
        }
        return res.json({
            success: success,
            listado: informacionreg
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
////metodo para actualizar datos de los estudiantes matriculados consumiendo informacion del registro civil
router.get('/actualizardatosmatriculadosenlacentralizada', async (req, res) => {
    try {
        var listamatriculados = []
        var datosregistro = await new Promise(resolve => { administracion.listacarrerasmaster((err, valor) => { resolve(valor); }) });
        if (datosregistro != null) {
            var periodovigente = await new Promise((resolve) => {
                administracion.periodovigentemaster((err, valor) => {
                    resolve(valor);
                });
            });
            if (periodovigente != null) {
                for (carrera of datosregistro) {
                    var matriculadoscarrera = await new Promise((resolve) => {
                        administracion.ObtenerMatriculasdadocarrerayperiodo(carrera.Carrera, carrera.strCodigo, carrera.Facultad, carrera.codigofacultad, carrera.Sede, carrera.strBaseDatos, periodovigente[0].strCodigo, (err, valor) => {
                            resolve(valor);
                        });
                    });
                    if (matriculadoscarrera != null) {
                        for (var matricula of matriculadoscarrera.recordset) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodovigente[0].strCodigo)
                    }
                }
                console.log('Longitud de la lista de matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = []
                    for (var i = 0; i < listamatriculados.length; i++) {
                        var cedula = listamatriculados[i].strCedula;
                        cedula = cedula.replace('-', '')
                        var datosregistrocivil = await new Promise((resolve) => {
                            consumoservicioregistrocivil(cedula, (err, valor) => {
                                resolve(valor);
                            });
                        });
                        if (datosregistrocivil != null) {
                            var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                            //console.log(personapersonalizada.length)
                            if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                                //modificar los datos en la centralizada 
                                var actualizarpersona = await new Promise(resolve => { centralizada.actualizarpersonaprocedencia(datosregistrocivil, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                if (actualizarpersona == true) {
                                    var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersonalizado(datosregistrocivil.per_nacionalidad, datosregistrocivil.nac_reqvisa, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                    if (actualizanacionalidad == true) {
                                        console.log('Datos de la persona actualizados correctamente N° ' + i)
                                    }
                                    else {
                                        console.log('No se ha actualizado la nacionalidad del estudiante: ' + cedula)
                                    }
                                }
                                else {
                                    console.log('No se ha actualizado la información del estudiante: ' + cedula)
                                }
                            }
                            else {
                                //registrar la persona en la centralizada
                                var ingresopersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(datosregistrocivil, (err, valor) => { resolve(valor); }) });
                                if (ingresopersona == true) {
                                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(datosregistrocivil.per_nombres, datosregistrocivil.per_primerapellido, datosregistrocivil.per_segundoapellido, datosregistrocivil.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                                    if (persona.length > 0) {
                                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(cedula, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                                        if (documentopersonalreg == true) {
                                            ////pendiente registrar en la tabla domicilio y nacionalidad
                                            var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, datosregistrocivil.dir_calleprincipal, datosregistrocivil.dir_numcasa, datosregistrocivil.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
                                            if (ingresodireccion == true) {
                                                var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, datosregistrocivil.nac_reqvisa, datosregistrocivil.per_nacionalidad, (err, valor) => { resolve(valor); }) });
                                                if (ingresoNacionalidad == true) {
                                                    console.log('Registro ingresado correctamente')
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                            listapersonalizada.push(personapersonalizada[0])
                        }
                        else {
                            console.log('No tiene informacion en el registro civil el estudiante: ' + listamatriculados[i].strCedula)
                        }
                    }
                    return res.json({
                        success: true,
                        matriculados: listapersonalizada
                    });
                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existe información de los estudiantes matriculados'
                    });
                }
            } else {
                return res.json({
                    success: false,
                    mensaje: 'No existe un periodo vigente'
                });
            }
        } else {
            return res.json({
                success: false,
                mensaje: 'No existen carreras en la base master'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

////metodo para actualizar datos de los estudiantes matriculados consumiendo informacion del registro civil dado idperiodo
router.get('/actualizardatosmatriculadosenlacentralizada/:periodo', async (req, res) => {
    const codperiodo = req.params.periodo;
    try {
        var listamatriculados = []
        var datosregistro = await new Promise(resolve => { administracion.listacarrerasmaster((err, valor) => { resolve(valor); }) });
        if (datosregistro != null) {
            var periodo = await new Promise((resolve) => {
                administracion.periodomasterdadocodigo(codperiodo, (err, valor) => {
                    resolve(valor);
                });
            });
            if (periodo != null) {
                for (carrera of datosregistro) {
                    var matriculadoscarrera = await new Promise((resolve) => {
                        administracion.ObtenerMatriculasdadocarrerayperiodo(carrera.Carrera, carrera.strCodigo, carrera.Facultad, carrera.codigofacultad, carrera.Sede, carrera.strBaseDatos, periodo[0].strCodigo, (err, valor) => {
                            resolve(valor);
                        });
                    });
                    if (matriculadoscarrera != null) {
                        for (var matricula of matriculadoscarrera.recordset) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodo[0].strCodigo)
                    }
                }
                console.log('Longitud de la lista de matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = []
                    for (var i = 0; i < listamatriculados.length; i++) {
                        var cedula = listamatriculados[i].strCedula;
                        cedula = cedula.replace('-', '')
                        var datosregistrocivil = await new Promise((resolve) => {
                            consumoservicioregistrocivil(cedula, (err, valor) => {
                                resolve(valor);
                            });
                        });
                        if (datosregistrocivil != null) {
                            var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                            //console.log(personapersonalizada.length)
                            if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                                //modificar los datos en la centralizada 
                                var actualizarpersona = await new Promise(resolve => { centralizada.actualizarpersonaprocedencia(datosregistrocivil, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                if (actualizarpersona == true) {
                                    var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersonalizado(datosregistrocivil.per_nacionalidad, datosregistrocivil.nac_reqvisa, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                    if (actualizanacionalidad == true) {
                                        console.log('Datos de la persona actualizados correctamente N° ' + i)
                                    }
                                    else {
                                        console.log('No se ha actualizado la nacionalidad del estudiante: ' + cedula)
                                    }
                                }
                                else {
                                    console.log('No se ha actualizado la información del estudiante: ' + cedula)
                                }
                            }
                            else {
                                //registrar la persona en la centralizada
                                var ingresopersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(datosregistrocivil, (err, valor) => { resolve(valor); }) });
                                if (ingresopersona == true) {
                                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(datosregistrocivil.per_nombres, datosregistrocivil.per_primerapellido, datosregistrocivil.per_segundoapellido, datosregistrocivil.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                                    if (persona.length > 0) {
                                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(cedula, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                                        if (documentopersonalreg == true) {
                                            ////pendiente registrar en la tabla domicilio y nacionalidad
                                            var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, datosregistrocivil.dir_calleprincipal, datosregistrocivil.dir_numcasa, datosregistrocivil.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
                                            if (ingresodireccion == true) {
                                                var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, datosregistrocivil.nac_reqvisa, datosregistrocivil.per_nacionalidad, (err, valor) => { resolve(valor); }) });
                                                if (ingresoNacionalidad == true) {
                                                    console.log('Registro ingresado correctamente')
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                            listapersonalizada.push(personapersonalizada[0])
                        }
                        else {
                            console.log('No tiene informacion en el registro civil el estudiante: ' + listamatriculados[i].strCedula)
                        }
                    }
                    return res.json({
                        success: true,
                        matriculados: listapersonalizada
                    });
                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existe información de los estudiantes matriculados'
                    });
                }
            } else {
                return res.json({
                    success: false,
                    mensaje: 'No existe un periodo vigente'
                });
            }
        } else {
            return res.json({
                success: false,
                mensaje: 'No existen carreras en la base master'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/actualizardatosmatriculado/:cedula', async (req, res) => {
    const cedula = req.params.cedula
    var personacentralizada = {}
    try {
        var datosregistrocivil = await new Promise((resolve) => {
            consumoservicioregistrocivil(cedula, (err, valor) => {
                resolve(valor);
            });
        });
        console.log(datosregistrocivil)
        if (datosregistrocivil != null) {
            var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
            //console.log(personapersonalizada.length)
            if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                //modificar los datos en la centralizada 

                var actualizarpersona = await new Promise(resolve => { centralizada.actualizarpersonaprocedencia(datosregistrocivil, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                if (actualizarpersona == true) {
                    var actualizanacionalidad = await new Promise(resolve => { centralizada.modificarnacionalidadpersonalizado(datosregistrocivil.per_nacionalidad, datosregistrocivil.nac_reqvisa, personapersonalizada[0].per_id, (err, valor) => { resolve(valor); }) });
                    if (actualizanacionalidad == true) {
                        console.log('Datos de la persona actualizados correctamente')
                    }
                    else {
                        console.log('No se ha actualizado la nacionalidad del estudiante: ' + cedula)
                    }
                }
                else {
                    console.log('No se ha actualizado la información del estudiante: ' + cedula)
                }
            }
            else {
                //registrar la persona en la centralizada
                var ingresopersona = await new Promise(resolve => { centralizada.ingresoPersonaCentralizada(datosregistrocivil, (err, valor) => { resolve(valor); }) });
                if (ingresopersona == true) {
                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(datosregistrocivil.per_nombres, datosregistrocivil.per_primerapellido, datosregistrocivil.per_segundoapellido, datosregistrocivil.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                    if (persona.length > 0) {
                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(cedula, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                        if (documentopersonalreg == true) {
                            ////pendiente registrar en la tabla domicilio y nacionalidad
                            var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, datosregistrocivil.dir_calleprincipal, datosregistrocivil.dir_numcasa, datosregistrocivil.lugarprocedencia_id, (err, valor) => { resolve(valor); }) });
                            if (ingresodireccion == true) {
                                var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, datosregistrocivil.nac_reqvisa, datosregistrocivil.per_nacionalidad, (err, valor) => { resolve(valor); }) });
                                if (ingresoNacionalidad == true) {
                                    console.log('Registro ingresado correctamente')
                                }
                            }
                        }
                    }
                }
            }
            personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonareportematriculados(cedula, (err, valor) => { resolve(valor); }) });
            personacentralizada = personapersonalizada[0]
        }
        else {
            console.log('No tiene informacion en el registro civil el estudiante: ' + cedula)
        }
        return res.json({
            success: true,
            persona: personacentralizada
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

//// reporte de estudiantes matriculados consumiendo la centralizada
router.get('/listamatriculadosactualizados', async (req, res) => {
    try {
        var listamatriculados = []
        var datosregistro = await new Promise(resolve => { administracion.listacarrerasmaster((err, valor) => { resolve(valor); }) });
        if (datosregistro != null) {
            var periodovigente = await new Promise((resolve) => {
                administracion.periodovigentemaster((err, valor) => {
                    resolve(valor);
                });
            });
            if (periodovigente != null) {
                for (carrera of datosregistro) {
                    var matriculadoscarrera = await new Promise((resolve) => {
                        administracion.ObtenerMatriculasdadocarrerayperiodo(carrera.Carrera, carrera.strCodigo, carrera.Facultad, carrera.codigofacultad, carrera.Sede, carrera.strBaseDatos, periodovigente[0].strCodigo, (err, valor) => {
                            resolve(valor);
                        });
                    });
                    if (matriculadoscarrera != null) {
                        for (var matricula of matriculadoscarrera.recordset) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodovigente[0].strCodigo)
                    }
                }
                console.log('Longitud de la lista de matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = []
                    var cont = 1
                    for (var i = 0; i < listamatriculados.length; i++) {
                        var cedula = listamatriculados[i].strCedula;
                        cedula = cedula.replace('-', '')
                        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonareportematriculados(cedula, (err, valor) => { resolve(valor); }) });
                        //console.log(personapersonalizada.length)

                        if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                            var nacionalidad = ''
                            /*if (personapersonalizada[0].nac_id != null) {
                                nacionalidad = personapersonalizada[0].nac_nombre
                            }
                            else {
                                nacionalidad = listamatriculados[i].strNacionalidad
                            }*/
                            var datosprocedencia = personapersonalizada[0].procedencia.split('/')
                            var procedencia = ''
                            var provincia = 'NO ESPECIFICADO'
                            var ciudad = 'NO ESPECIFICADO'
                            var parroquia = 'NO ESPECIFICADO'

                            if (datosprocedencia[1] == 'NO ESPECIFICADO') {
                                nacionalidad = datosprocedencia[0]
                            }
                            else {
                                nacionalidad = 'ECUADOR'
                                provincia = datosprocedencia[0]
                                ciudad = datosprocedencia[1]
                                parroquia = datosprocedencia[2]
                                //procedencia = datosprocedencia[0] + '/' + datosprocedencia[1] + '/' + datosprocedencia[2]

                            }
                            var objestudiante = {
                                contador: cont,
                                cedula: personapersonalizada[0].pid_valor,
                                nombres: personapersonalizada[0].per_nombres + ' ' + personapersonalizada[0].per_primerApellido + ' ' + personapersonalizada[0].per_segundoApellido,
                                codcarrera: listamatriculados[i].codcarrera,
                                carrera: listamatriculados[i].Carrera,
                                codfacultad: listamatriculados[i].codfacultad,
                                facultad: listamatriculados[i].Facultad,
                                sede: listamatriculados[i].sede,
                                periodo: listamatriculados[i].strCodPeriodo,
                                nacionalidad: nacionalidad,
                                provincia: provincia,
                                ciudad: ciudad,
                                parroquia: parroquia,
                                sexo: personapersonalizada[0].sexo,
                                genero: personapersonalizada[0].gen_nombre,
                                emailinstitucional: personapersonalizada[0].per_email,
                                emailpersonal: personapersonalizada[0].per_emailAlternativo,
                                celular: personapersonalizada[0].per_telefonoCelular,
                                codigoestudiante: listamatriculados[i].sintCodigo,
                                nivel: listamatriculados[i].strCodNivel

                            }
                            listapersonalizada.push(objestudiante)
                            cont = cont + 1
                        }
                    }
                    if (listapersonalizada.length > 0) {
                        var reportebase64 = await new Promise((resolve) => {
                            reportematriculadosExcel(listapersonalizada, (err, valor) => {
                                resolve(valor);
                            });
                        });
                        return res.json({
                            success: true,
                            reporte: reportebase64
                        });
                    } else {
                        return res.json({
                            success: false,
                            mensaje: 'No existe información de los estudiantes matriculados'
                        });
                    }

                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existe información de los estudiantes matriculados'
                    });
                }
                return res.json({
                    success: true,
                    matriculados: listapersonalizada
                });
            } else {
                return res.json({
                    success: false,
                    mensaje: 'No existe un periodo vigente'
                });
            }

        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen carreras en la base master'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

//// reporte de estudiantes matriculados dado el periodo consumiendo la centralizada
router.get('/listamatriculadosactualizadosporperiodo/:periodo', async (req, res) => {
    const codperiodo = req.params.periodo
    var conex = bd;
    const pool = new sql.ConnectionPool(conex);
    await pool.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        var listamatriculados = []
        var datosregistro = await ejecutarConsultaSQLcontransacion(transaction, "SELECT Carreras.strCodigo, Carreras.strBaseDatos, Carreras.strCodEstado, Escuelas.strNombre, Facultades.strNombre AS Facultad, Facultades.strCodigo as codigofacultad, Carreras.strNombre AS Carrera, strSede as Sede"
            + " FROM Carreras INNER JOIN Escuelas ON Carreras.strCodEscuela = Escuelas.strCodigo INNER JOIN Facultades ON Escuelas.strCodFacultad = Facultades.strCodigo ");
        if (datosregistro != null) {
            var periodovigente = await ejecutarConsultaSQLcontransacion(transaction, "SELECT * FROM dbo.[Periodos] WHERE  strCodigo='" + codperiodo + "'");
            if (periodovigente != null) {
                for (carrera of datosregistro) {
                    var matriculadoscarrera = await ejecutarConsultaSQLcontransacion(transaction, "select  sintCodigo, strCodPeriodo, strCodEstud, strCedula, strNacionalidad, strCodNivel, strAutorizadaPor, dtFechaAutorizada,"
                        + " strCreadaPor, dtFechaCreada, strCodEstado, cast ('" + carrera.Carrera + "' as varchar(150)) as Carrera,'" + carrera.strCodigo + "' as codcarrera, "
                        + " cast ('" + carrera.Facultad + "' as varchar(150)) as Facultad, '" + carrera.codigofacultad + "' as codfacultad, '" + carrera.Sede + "' as sede from [" + carrera.strBaseDatos + "].[dbo].matriculas "
                        + " inner join [" + carrera.strBaseDatos + "].[dbo].Estudiantes on matriculas.strCodEstud=Estudiantes.strCodigo where (strCodPeriodo = '" + codperiodo + "') and strCodEstado='DEF'");

                    if (matriculadoscarrera != null) {
                        for (var matricula of matriculadoscarrera) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodovigente[0].strCodigo)
                    }
                }
                console.log('Longitud de la lista de matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = []
                    var cont = 1
                    for (var i = 0; i < listamatriculados.length; i++) {
                        var cedula = listamatriculados[i].strCedula;
                        cedula = cedula.replace('-', '')
                        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonareportematriculados(cedula, (err, valor) => { resolve(valor); }) });
                        //console.log(personapersonalizada.length)

                        if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                            var nacionalidad = ''
                            /*if (personapersonalizada[0].nac_id != null) {
                                nacionalidad = personapersonalizada[0].nac_nombre
                            }
                            else {
                                nacionalidad = listamatriculados[i].strNacionalidad
                            }*/
                            var datosprocedencia = personapersonalizada[0].procedencia.split('/')
                            var procedencia = ''
                            var provincia = 'NO ESPECIFICADO'
                            var ciudad = 'NO ESPECIFICADO'
                            var parroquia = 'NO ESPECIFICADO'

                            if (datosprocedencia[1] == 'NO ESPECIFICADO') {
                                nacionalidad = datosprocedencia[0]
                            }
                            else {
                                nacionalidad = 'ECUADOR'
                                provincia = datosprocedencia[0]
                                ciudad = datosprocedencia[1]
                                parroquia = datosprocedencia[2]
                                //procedencia = datosprocedencia[0] + '/' + datosprocedencia[1] + '/' + datosprocedencia[2]

                            }
                            var objestudiante = {
                                contador: cont,
                                cedula: personapersonalizada[0].pid_valor,
                                nombres: personapersonalizada[0].per_nombres + ' ' + personapersonalizada[0].per_primerApellido + ' ' + personapersonalizada[0].per_segundoApellido,
                                codcarrera: listamatriculados[i].codcarrera,
                                carrera: listamatriculados[i].Carrera,
                                codfacultad: listamatriculados[i].codfacultad,
                                facultad: listamatriculados[i].Facultad,
                                sede: listamatriculados[i].sede,
                                periodo: listamatriculados[i].strCodPeriodo,
                                nacionalidad: nacionalidad,
                                provincia: provincia,
                                ciudad: ciudad,
                                parroquia: parroquia,
                                sexo: personapersonalizada[0].sexo,
                                genero: personapersonalizada[0].gen_nombre

                            }
                            listapersonalizada.push(objestudiante)
                            cont = cont + 1
                        }
                    }
                    if (listapersonalizada.length > 0) {
                        var reportebase64 = await new Promise((resolve) => {
                            reportematriculadosExcel(listapersonalizada, (err, valor) => {
                                resolve(valor);
                            });
                        });
                        return res.json({
                            success: true,
                            reporte: reportebase64
                        });
                    } else {
                        return res.json({
                            success: false,
                            mensaje: 'No existe información de los estudiantes matriculados'
                        });
                    }

                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existe información de los estudiantes matriculados'
                    });
                }
                return res.json({
                    success: true,
                    matriculados: listapersonalizada
                });
            } else {
                return res.json({
                    success: false,
                    mensaje: 'No existe un periodo vigente'
                });
            }

        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen carreras en la base master'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

router.get('/migrarestudiantesindicadoresdadoelperiodo/:periodo', async (req, res) => {
    const codperiodo = req.params.periodo;
    try {
        migrarmatriculadosdadoelcodigodelperiodo(codperiodo);
    } catch (err) {
        console.log('Error migrarestudiantesindicadoresdadoelperiodo: ' + err)
        return res.json({
            success: false
        });
    }
});

//// reporte de estudiantes matriculados dado el periodo consumiendo la centralizada
router.get('/listamatriculadosporperiodoycarrera/:periodo/:carrera', async (req, res) => {
    const codperiodo = req.params.periodo
    const basecarrera = req.params.carrera
    var conex = bd;
    const pool = new sql.ConnectionPool(conex);
    await pool.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        var listamatriculados = []
        var datosregistro = await ejecutarConsultaSQLcontransacion(transaction, "SELECT Carreras.strCodigo, Carreras.strBaseDatos, Carreras.strCodEstado, Escuelas.strNombre, Facultades.strNombre AS Facultad, Facultades.strCodigo as codigofacultad, Carreras.strNombre AS Carrera, strSede as Sede"
            + " FROM Carreras INNER JOIN Escuelas ON Carreras.strCodEscuela = Escuelas.strCodigo INNER JOIN Facultades ON Escuelas.strCodFacultad = Facultades.strCodigo where strBaseDatos='" + basecarrera + "'");
        if (datosregistro != null) {
            var periodovigente = await ejecutarConsultaSQLcontransacion(transaction, "SELECT * FROM dbo.[Periodos] WHERE  strCodigo='" + codperiodo + "'");
            if (periodovigente != null) {
                for (carrera of datosregistro) {
                    var matriculadoscarrera = await ejecutarConsultaSQLcontransacion(transaction, "select  sintCodigo, strCodPeriodo, strCodEstud, strCedula, strNacionalidad, strCodNivel, strAutorizadaPor, dtFechaAutorizada,"
                        + " strCreadaPor, dtFechaCreada, strCodEstado, cast ('" + carrera.Carrera + "' as varchar(150)) as Carrera,'" + carrera.strCodigo + "' as codcarrera, "
                        + " cast ('" + carrera.Facultad + "' as varchar(150)) as Facultad, '" + carrera.codigofacultad + "' as codfacultad, '" + carrera.Sede + "' as sede from [" + carrera.strBaseDatos + "].[dbo].matriculas "
                        + " inner join [" + carrera.strBaseDatos + "].[dbo].Estudiantes on matriculas.strCodEstud=Estudiantes.strCodigo where (strCodPeriodo = '" + codperiodo + "') and strCodEstado='DEF'");

                    if (matriculadoscarrera != null) {
                        for (var matricula of matriculadoscarrera) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodovigente[0].strCodigo)
                    }
                }
                console.log('Longitud de la lista de matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = []
                    var cont = 1
                    for (var i = 0; i < listamatriculados.length; i++) {
                        var cedula = listamatriculados[i].strCedula;
                        cedula = cedula.replace('-', '')
                        var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonareportematriculadosPersonalizado(cedula, (err, valor) => { resolve(valor); }) });
                        //console.log(personapersonalizada.length)

                        if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                            var nacionalidad = ''
                            /*if (personapersonalizada[0].nac_id != null) {
                                nacionalidad = personapersonalizada[0].nac_nombre
                            }
                            else {
                                nacionalidad = listamatriculados[i].strNacionalidad
                            }*/
                            var datosprocedencia = personapersonalizada[0].procedencia.split('/')
                            var procedencia = ''
                            var provincia = 'NO ESPECIFICADO'
                            var ciudad = 'NO ESPECIFICADO'
                            var parroquia = 'NO ESPECIFICADO'

                            if (datosprocedencia[1] == 'NO ESPECIFICADO') {
                                nacionalidad = datosprocedencia[0]
                            }
                            else {
                                nacionalidad = 'ECUADOR'
                                provincia = datosprocedencia[0]
                                ciudad = datosprocedencia[1]
                                parroquia = datosprocedencia[2]
                                //procedencia = datosprocedencia[0] + '/' + datosprocedencia[1] + '/' + datosprocedencia[2]

                            }
                            var objestudiante = {
                                contador: cont,
                                cedula: cedula,
                                nombres: personapersonalizada[0].per_nombres + ' ' + personapersonalizada[0].per_primerApellido + ' ' + personapersonalizada[0].per_segundoApellido,
                                codcarrera: listamatriculados[i].codcarrera,
                                fechasperiodo: periodovigente[0].strDescripcion,
                                carrera: listamatriculados[i].Carrera,
                                codfacultad: listamatriculados[i].codfacultad,
                                facultad: listamatriculados[i].Facultad,
                                codigoestudiante: listamatriculados[i].strCodEstud,
                                sede: listamatriculados[i].sede,
                                periodo: listamatriculados[i].strCodPeriodo,
                                nacionalidad: nacionalidad,
                                provincia: provincia,
                                ciudad: ciudad,
                                parroquia: parroquia,
                                nivel: listamatriculados[i].strCodNivel,
                                sexo: personapersonalizada[0].sexo,
                                genero: personapersonalizada[0].gen_nombre,
                                etnia: personapersonalizada[0].etn_nombre,
                                fechanacimiento: personapersonalizada[0].per_fechaNacimiento,
                                direccion: personapersonalizada[0].dir_callePrincipal,
                                parroquiaresidencia: personapersonalizada[0].parroquiadireccion

                            }
                            listapersonalizada.push(objestudiante)
                            cont = cont + 1
                        }
                    }
                    if (listapersonalizada.length > 0) {
                        var reportebase64 = await new Promise((resolve) => {
                            reportematriculadosExcelPersonalizado(listapersonalizada, (err, valor) => {
                                resolve(valor);
                            });
                        });
                        return res.json({
                            success: true,
                            reporte: reportebase64
                        });
                    } else {
                        return res.json({
                            success: false,
                            mensaje: 'No existe información de los estudiantes matriculados'
                        });
                    }

                }
                else {
                    return res.json({
                        success: false,
                        mensaje: 'No existe información de los estudiantes matriculados'
                    });
                }
                return res.json({
                    success: true,
                    matriculados: listapersonalizada
                });
            } else {
                return res.json({
                    success: false,
                    mensaje: 'No existe un periodo vigente'
                });
            }

        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existen carreras en la base master'
            });
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

/// migración de estudiantes matriculados a la base de indicadores dado el periodo --- servicio de alta concurrencia
async function migrarmatriculadosdadoelcodigodelperiodo(codperiodo) {
    let lst = [];
    const sql = require('mssql');
    try {
        var config = {
            user: "sa",
            "password": "BDSqlAdmin111",
            "server": "172.17.102.218",
            //  password: "@SQLserver",
            // server: "172.17.103.26",
            database: "OAS_Master",
            portNumber: "1435",
            pool: {
                max: 300000,
                min: 0,
                idleTimeoutMillis: 60,
            },
            options: {
                encrypt: false, // for azure
                trustServerCertificate: false, // change to true for local dev / self-signed certs
            }
        };

        var conex = bd;
        const pool = new sql.ConnectionPool(conex);
        await pool.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        var listamatriculados = []
        var datosregistro = await ejecutarConsultaSQLcontransacion(transaction, "SELECT Carreras.strCodigo, Carreras.strBaseDatos, Carreras.strCodEstado, Escuelas.strNombre, Facultades.strNombre AS Facultad, Facultades.strCodigo as codigofacultad, Carreras.strNombre AS Carrera, strSede as Sede"
            + " FROM Carreras INNER JOIN Escuelas ON Carreras.strCodEscuela = Escuelas.strCodigo INNER JOIN Facultades ON Escuelas.strCodFacultad = Facultades.strCodigo ");
        if (datosregistro != null) {
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
            var periodovigente = await ejecutarConsultaSQLcontransacion(transaction, "SELECT * FROM dbo.[Periodos] WHERE  strCodigo='" + codperiodo + "'");
            if (periodovigente != null) {
                var periodo = periodovigente.recordset[0]
                var listacarreras = datosregistro.recordset
                for (var carrera of listacarreras) {
                    var matriculadoscarrera = await ejecutarConsultaSQLcontransacion(transaction, "select  sintCodigo, strCodPeriodo, strCodEstud, strCedula, strNombres, strApellidos, strCodSexo, strNacionalidad, strCodNivel, strAutorizadaPor, dtFechaAutorizada,"
                        + " strCreadaPor, dtFechaCreada, strCodEstado, cast ('" + carrera.Carrera + "' as varchar(150)) as Carrera,'" + carrera.strCodigo + "' as codcarrera, "
                        + " cast ('" + carrera.Facultad + "' as varchar(150)) as Facultad, '" + carrera.codigofacultad + "' as codfacultad, '" + carrera.Sede + "' as sede from [" + carrera.strBaseDatos + "].[dbo].matriculas "
                        + " inner join [" + carrera.strBaseDatos + "].[dbo].Estudiantes on matriculas.strCodEstud=Estudiantes.strCodigo where (strCodPeriodo = '" + periodo.strCodigo + "') and strCodEstado='DEF'");
                    if (matriculadoscarrera != null) {
                        var listamatricula = matriculadoscarrera.recordset
                        for (var matricula of listamatricula) {
                            listamatriculados.push(matricula)
                        }
                    }
                    else {
                        console.log('No existen estudiantes matriculados en la carrera: ' + carrera.Carrera + ' base de datos:' + carrera.strBaseDatos + ' en el periodo: ' + periodo.strCodigo)
                    }
                }
                console.log('Matriculados: ' + listamatriculados.length)
                if (listamatriculados != null) {
                    var listapersonalizada = await obtenerdatoscentralizada(listamatriculados);
                    console.log('Lista personalizada: ' + listapersonalizada.length)
                    if (listapersonalizada.length > 0) {
                        var cantreg = 0;
                        var cantmod = 0;
                        for (var registro of listapersonalizada) {
                            var registrado = await ejecutarConsultaSQLcontransacion(transaction, "select  *  from [Informacion_Institucional].[dbo].[Academico_Central_EstudiantesMatriculados] where (codperiodo = '" + registro.periodo + "') and (cedula='" + registro.cedula + "')");
                            if ((registrado != null) && (registrado.recordset.length > 0)) {
                                var modificar = await ejecutarConsultaSQLcontransacion(transaction, "UPDATE [Informacion_Institucional].[dbo].[Academico_Central_EstudiantesMatriculados] SET apellidosynombres='" + registro.nombres + "', codcarrera='" + registro.codcarrera + "', carrera='" + registro.carrera + "', codfacultad='" + registro.codfacultad + "', facultad='" + registro.facultad + "', sede='" + registro.sede + "', paisorigen='" + registro.nacionalidad + "', provincia='" + registro.provincia + "', ciudad='" + registro.ciudad + "', parroquia='" + registro.parroquia + "', sexo='" + registro.sexo + "', genero='" + registro.genero + "' "
                                    + " WHERE cedula='" + registro.cedula + "' and codperiodo='" + registro.periodo + "'");
                                if (modificar.rowsAffected == 1) {
                                    cantmod = cantmod + 1
                                }
                            }
                            else {
                                var registrar = await ejecutarConsultaSQLcontransacion(transaction, "INSERT INTO [Informacion_Institucional].[dbo].[Academico_Central_EstudiantesMatriculados] ( cedula, codperiodo, apellidosynombres, codcarrera, carrera, codfacultad, facultad, sede, paisorigen, provincia, ciudad, parroquia, sexo, genero) "
                                    + "VALUES('" + registro.cedula + "', '" + registro.periodo + "', '" + registro.nombres + "', '" + registro.codcarrera + "','" + registro.carrera + "', '" + registro.codfacultad + "', '" + registro.facultad + "', '" + registro.sede + "', '" + registro.nacionalidad + "','" + registro.provincia + "','" + registro.ciudad + "','" + registro.parroquia + "', '" + registro.sexo + "','" + registro.genero + "');");
                                if (registrar.rowsAffected == 1) {
                                    cantreg = cantreg + 1
                                }
                            }
                        }
                        try {
                            await transaction.commit();
                            var fechaactualizacion = formatDateRegistrar(new Date());
                            var actualizarfecha = await new Promise(resolve => { administracion.actualizarfechamigracion(fechaactualizacion, (err, valor) => { resolve(valor); }) });
                            await pool.close();
                            console.log('Migración correcta - Registros ingresados: ' + cantreg + ' / Registros modificados: ' + cantmod)
                        } catch (error) {
                            await transaction.rollback();
                            await pool.close();
                            var fechaerror = formatDateRegistrar(new Date());
                            var registrarerror = await new Promise(resolve => { administracion.registrarerrormigracion(error, fechaerror, (err, valor) => { resolve(valor); }) });
                            console.error('Alguna consulta no tiene datos. La transacción ha sido revertida.');
                        }
                    } else {
                        console.log('No existe información de los estudiantes matriculados')
                    }

                }
                else {
                    console.log('No existe información de los estudiantes matriculados')
                }
            } else {
                console.log('No existe un periodo vigente')
            }

        }
        else {
            console.log('No existen carreras en la base master')
        }
    } catch (err) {
        console.log('Error: ' + err)
    }
}

async function obtenerdatoscentralizada(listamatriculados) {
    const credentials = {
        "user": "sistema",
        "password": "Sistemas",
        "host": "172.17.102.14",
        "database": "centralizacion_db",
        "port": "3311"
    };

    const poolpg = new Pool(credentials);

    var listapersonalizada = []
    var cont = 1
    for (var i = 0; i < listamatriculados.length; i++) {
        var cedula = listamatriculados[i].strCedula;
        cedula = cedula.replace('-', '')
        var personapersonalizada = await poolpg.query("SELECT p.per_id, d.pid_valor, p.per_nombres, p.\"per_primerApellido\", p.\"per_segundoApellido\", p.per_email, p.\"per_emailAlternativo\", p.\"per_telefonoCelular\", \"per_fechaNacimiento\", p.etn_id, et.etn_nombre, p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p.\"per_telefonoCasa\", p.lugarprocedencia_id, prr.prq_nombre, dir.\"dir_callePrincipal\", nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia, case when (split_part(p.per_procedencia,'|',2)!='1') THEN concat((select pro_nombre from central.provincia where pro_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = CAST(split_part(p.per_procedencia,'|',3) AS integer))) "
            + " else concat((select pai_nombre from central.pais where pai_id = CAST(split_part(p.per_procedencia,'|',1) AS integer)),'/',(select ciu_nombre from central.ciudad where ciu_id = CAST(split_part(p.per_procedencia,'|',2) AS integer)),'/', (select prq_nombre from central.parroquia where prq_id = 1)) end as procedencia, p.per_conyuge, p.per_idconyuge "
            + "FROM central.persona p INNER JOIN central.\"documentoPersonal\" d ON p.per_id=d.per_id INNER JOIN central.etnia et on p.etn_id=et.etn_id LEFT JOIN central.direccion dir on p.per_id=dir.per_id LEFT JOIN central.parroquia prr on p.lugarprocedencia_id=prr.prq_id LEFT JOIN central.\"nacionalidadPersona\" np on p.per_id=np.per_id LEFT JOIN central.nacionalidad nac on np.nac_id=nac.nac_id INNER JOIN central.genero gn on p.gen_id=gn.gen_id INNER JOIN central.\"estadoCivil\" estc on p.eci_id=estc.eci_id LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id"
            + " WHERE d.pid_valor= '" + cedula + "'  ");
        //var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonareportematriculados(cedula, (err, valor) => { resolve(valor); }) });
        //console.log(personapersonalizada.length)
        if ((personapersonalizada != null) && (personapersonalizada.rows[0] != undefined)) {
            var personacentralizada = personapersonalizada.rows[0]
            var nacionalidad = ''
            var datosprocedencia = personacentralizada.procedencia.split('/')
            var procedencia = ''
            var provincia = 'NO ESPECIFICADO'
            var ciudad = 'NO ESPECIFICADO'
            var parroquia = 'NO ESPECIFICADO'

            if (datosprocedencia[1] == 'NO ESPECIFICADO') {
                nacionalidad = datosprocedencia[0]
            }
            else {
                nacionalidad = 'ECUADOR'
                provincia = datosprocedencia[0]
                ciudad = datosprocedencia[1]
                parroquia = datosprocedencia[2]

            }
            var objestudiante = {
                contador: cont,
                cedula: personacentralizada.pid_valor,
                nombres: personacentralizada.per_nombres + ' ' + personacentralizada.per_primerApellido + ' ' + personacentralizada.per_segundoApellido,
                codcarrera: listamatriculados[i].codcarrera,
                carrera: listamatriculados[i].Carrera,
                codfacultad: listamatriculados[i].codfacultad,
                facultad: listamatriculados[i].Facultad,
                sede: listamatriculados[i].sede,
                periodo: listamatriculados[i].strCodPeriodo,
                nacionalidad: nacionalidad,
                provincia: provincia,
                ciudad: ciudad,
                parroquia: parroquia,
                sexo: personacentralizada.sexo,
                genero: personacentralizada.gen_nombre

            }
            listapersonalizada.push(objestudiante)
            cont = cont + 1
        } else {
            var sexo = ''
            var genero = ''
            if (listamatriculados[i].strCodSexo == 'MAS') {
                sexo = 'HOMBRE'
                genero = 'MASCULINO'
            }
            else {
                sexo = 'MUJER'
                genero = 'FEMENINO'
            }
            var objmatriculado = {
                contador: cont,
                cedula: cedula,
                nombres: listamatriculados[i].strNombres + ' ' + listamatriculados[i].strApellidos,
                codcarrera: listamatriculados[i].codcarrera,
                carrera: listamatriculados[i].Carrera,
                codfacultad: listamatriculados[i].codfacultad,
                facultad: listamatriculados[i].Facultad,
                sede: listamatriculados[i].sede,
                periodo: listamatriculados[i].strCodPeriodo,
                nacionalidad: listamatriculados[i].strNacionalidad,
                provincia: 'NO ESPECIFICADO',
                ciudad: 'NO ESPECIFICADO',
                parroquia: 'NO ESPECIFICADO',
                sexo: sexo,
                genero: genero

            }
            listapersonalizada.push(objmatriculado)
            cont = cont + 1
        }
    }
    await poolpg.end();
    return (listapersonalizada)
}

router.get('/periodovigente', async (req, res) => {
    try {
        var periodovigente = await new Promise(resolve => { administracion.periodovigentemaster((err, valor) => { resolve(valor); }) });
        return res.json({
            success: true,
            periodo: periodovigente[0]
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false,
            mensaje: 'No existe un periodo activo en la base master'
        });
    }
});


router.get('/actualizarmatriculados', async (req, res) => {
    try {

        var listamatriculados = await new Promise(resolve => { traermatriculasperiodovigente((err, valor) => { resolve(valor); }) });
        if (listamatriculados != null) {
            for (var i = 0; i < listamatriculados.length; i++) {
                var cedula = listamatriculados[i].cedula;

            }
        }
        else {
            return res.json({
                success: false,
                mensaje: 'No existe información de los estudiantes matriculados'
            });
        }

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
            if ((cedula.length == 10) || (cedula.length == 13)) {
                var registraruc = false;
                tipo = 2;
                if (cedula.length == 13) {
                    registraruc = true;
                    cedula = cedula.substring(0, 10);
                }
                var personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                if ((personapersonalizada != null) && (personapersonalizada.length > 0)) {
                    if (registraruc == true) {
                        var ruc = cedula + '001';
                        var rucreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(ruc, 2, personapersonalizada[0].per_id, true, (err, valor) => { resolve(valor); }) });
                        if (rucreg == true) {
                            personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(ruc, (err, valor) => { resolve(valor); }) });
                        }
                        else {
                            return res.json({
                                success: false,
                                mensaje: 'Error al registrar el ruc de la persona'
                            });
                        }
                    }
                } else {
                    var registrar = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                    if (registrar != null) {
                        personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(cedula, (err, valor) => { resolve(valor); }) });
                        if (registraruc == true) {
                            var ruc = cedula + '001';
                            var rucreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonalGenerico(ruc, 2, personapersonalizada[0].per_id, true, (err, valor) => { resolve(valor); }) });
                            if (rucreg == true) {
                                personapersonalizada = await new Promise(resolve => { centralizada.obtenerpersonadatoscompletos(ruc, (err, valor) => { resolve(valor); }) });
                            }
                            else {
                                return res.json({
                                    success: false,
                                    mensaje: 'Error al registrar el ruc de la persona'
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
                return res.json({
                    success: true,
                    listado: personapersonalizada
                });
            }
            else {
                return res.json({
                    success: false,
                    mensaje: 'Cédula o Documento incorrecto'
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

router.get('/obtenerDiscapacidad/:cedula', async (req, res) => {
    const cedula = req.params.cedula
    var mensaje = ''
    var informacionpersona = {}
    var personacentralizada = {}
    try {
        var discapacidad = await new Promise(resolve => { consumodinardapMSP(cedula, (valor) => { resolve(valor); }) });
        if (discapacidad != null) {
            if (discapacidad.codigoconadis != '') {
                if (!discapacidad.tipodiscapacidad == "") {
                    var objtipodiscapacidad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('tipoDiscapacidad', 'tdi_nombre', discapacidad.tipodiscapacidad, (err, valor) => { resolve(valor); }) });
                }
                personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonadiscapacidad(cedula, (err, valor) => { resolve(valor); }) });
                if (personacentralizada.length > 0) {
                    if (personacentralizada[0].admision == false) {
                        var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                        if ((carnetdiscregistrado != null) && (carnetdiscregistrado.length > 0)) {
                            var discapacidadregistrada = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('discapacidad', 'cdi_id', carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                            if ((discapacidadregistrada != null) && (discapacidadregistrada.length > 0)) {
                                discapacidadregistrada.dis_valor = 0;
                                discapacidadregistrada.tdi_id = objtipodiscapacidad[0].tdi_id;
                                var discapacidadactualizada = await new Promise(resolve => { centralizada.actualizardiscapacidad(discapacidadregistrada.dis_valor, discapacidadregistrada.tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                                if (discapacidadactualizada == true) {
                                    console.log('Discapacidad actualizada')
                                }
                            }
                            else {
                                ///registrar discapacidad
                                var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(0, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                                if (discapacidadregistrada == true) {
                                    console.log('Discapacidad registrada con carnet vigente')
                                }
                            }
                        }
                        else {
                            var carnetdis = await new Promise(resolve => { centralizada.ingresocarnetDiscapacidad(discapacidad.codigoconadis, discapacidad.idorganizacion, personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                            if (carnetdis == true) {
                                var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                                var discapacidadregistrada = await new Promise(resolve => { centralizada.ingresoDiscapacidad(0, objtipodiscapacidad[0].tdi_id, carnetdiscregistrado[0].cdi_id, (err, valor) => { resolve(valor); }) });
                                if (discapacidadregistrada == true) {
                                    console.log('Discapacidad y carnet de discapacidad registrados')
                                }

                            }
                        }
                        personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonadiscapacidad(cedula, (err, valor) => { resolve(valor); }) });
                        informacionpersona = personacentralizada[0]
                    }
                    else {
                        personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonadiscapacidad(cedula, (err, valor) => { resolve(valor); }) });
                        informacionpersona = personacentralizada[0]
                        mensaje = 'No se han modificado los datos de la persona porque ha sido registrada en el proceso de admisiones'
                    }
                }
                else {
                    mensaje = 'Persona no registrada en la centralizada'
                }
            }
            else {
                personacentralizada = await new Promise(resolve => { centralizada.obtenerpersonadiscapacidad(cedula, (err, valor) => { resolve(valor); }) });
                if ((personacentralizada.length > 0)) {
                    if (personacentralizada[0].idcarnetdiscapacidad != null) {
                        var carnetdiscregistrado = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampoparainteger('carnetDiscapacidad', 'per_id', personacentralizada[0].per_id, (err, valor) => { resolve(valor); }) });
                        if ((carnetdiscregistrado != null) && (carnetdiscregistrado.length > 0)) {
                            carnetdiscregistrado[0].cdi_habilitado = false
                            var actualizarcarnet = await new Promise(resolve => { centralizada.actualizarCarnetDiscapacidad(carnetdiscregistrado[0], (err, valor) => { resolve(valor); }) });
                            console.log(actualizarcarnet)
                            if (actualizarcarnet = 'true') {
                                console.log('Carnet de discapacidad modificado')
                            }
                        }
                    }
                }
                mensaje = 'No se ha encontrado información de discapacidad de la persona en el MSP'
            }
        }
        return res.json({
            success: true,
            persona: informacionpersona,
            mensaje: mensaje
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false,
            mensaje: 'No existe información de discapacidad en el MSP ni en la Centralizada'
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
                        if (actualizacion == true) {
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
                var estructuranombres = await new Promise(resolve => { actualizaciondenombrescentral(valor, (err, valor) => { resolve(valor); }) });
                if (estructuranombres != null) {
                    var actualizarregistro = await new Promise(resolve => { centralizada.modificarnombrespersona(estructuranombres.per_primerapellido, estructuranombres.per_segundoapellido, estructuranombres.per_nombres, objpersona.per_id, (err, valor) => { resolve(valor); }) });
                    if (actualizarregistro == true)
                        console.log("Nombres y apellidos de la persona actualizados correctamente")
                    else
                        console.log("No se actualizaron los nombres y apellidos de la persona")
                }
                else {
                    console.log("No se actualizaron los nombres y apellidos de la persona")
                }
                //lst.push(objpersona);
                break;
            case 3:   // gestiona conyuge verificando el estado civil registrado
                if (valor != "") {
                    actualizado = true;
                    var actualizacion = centralizada.actualizarpersona(tablacentralizada, campocentralizada, valor, objpersona.per_id, function (Result) { });
                    if (actualizacion == true) {
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
        if (actualizado == true) {
            var fechamodificacion = formatDate(new Date())
            var actualizacionfecha = await new Promise(resolve => { centralizada.actualizarpersona('persona', 'per_fechaModificacion', fechamodificacion, objpersona.per_id, (err, valor) => { resolve(valor); }) });
            console.log(actualizacionfecha)
            if (actualizacionfecha == true) {
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
                                    console.log('actualizacampos')
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
                                        const nombres = atr.valor;
                                        var estructuranombres = await new Promise(resolve => { actualizaciondenombrescentral(nombres, (err, valor) => { resolve(valor); }) });
                                        console.log(estructuranombres)
                                        if (estructuranombres != null) {
                                            primerApellido = estructuranombres.per_primerapellido
                                            segundoApellido = estructuranombres.per_segundoapellido
                                            nombrescompletos = estructuranombres.per_nombres
                                        }
                                        else {
                                            console.log("Error al obtener los nombres y apellidos estructurados")
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
                                            var objprovincia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('provincia', 'pro_nombre', provincia, (err, valor) => { resolve(valor); }) });
                                            if (objprovincia.length > 0) {
                                                idprovincia = objprovincia[0].pro_id;
                                            }
                                            else {
                                                idprovincia = 1;
                                            }
                                            var objciudad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('ciudad', 'ciu_nombre', ciudad, (err, valor) => { resolve(valor); }) });
                                            if (objciudad.length > 0) {
                                                idciudad = objciudad[0].ciu_id;
                                            }
                                            var objparroquia = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('parroquia', 'prq_nombre', parroquia, (err, valor) => { resolve(valor); }) });
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
                                        var objnacionalidad = await new Promise(resolve => { centralizada.obtenerregistrodadonombre('nacionalidad', 'nac_nombre', nacionalidad, (err, valor) => { resolve(valor); }) });
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
                                if (ingresopersona == true) {
                                    var persona = await new Promise(resolve => { centralizada.obtenerpersonadadonombresapellidosyfechanacimiento(personacentralizada.per_nombres, personacentralizada.per_primerapellido, personacentralizada.per_segundoapellido, personacentralizada.per_fechanacimiento, (err, valor) => { resolve(valor); }) });
                                    if (persona.length > 0) {
                                        listadevuelta.push(persona[0])
                                        var documentopersonalreg = await new Promise(resolve => { centralizada.ingresoDocumentoPersonal(cedulanueva, persona[0].per_id, (err, valor) => { resolve(valor); }) });
                                        if (documentopersonalreg == true) {
                                            ////pendiente registrar en la tabla domicilio y nacionalidad
                                            var ingresodireccion = await new Promise(resolve => { centralizada.ingresoDireccionPersona(persona[0].per_id, personacentralizada.dir_calleprincipal, personacentralizada.dir_numcasa, idparroquia, (err, valor) => { resolve(valor); }) });
                                            if (ingresodireccion == true) {
                                                var ingresoNacionalidad = await new Promise(resolve => { centralizada.ingresoNacionalidad(persona[0].per_id, personacentralizada.nac_reqvisa, personacentralizada.per_nacionalidad, (err, valor) => { resolve(valor); }) });
                                                if (ingresoNacionalidad == true) {
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

function formatDateRegistrar(date) {
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
        ].join(':') + ':00'
    );
}

function formatDateTime(date) {
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
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
            if (registrotitulo == true) {
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
            if (registroinstitucion == true) {
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
            if (registrartituloacademico == true) {
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
            if (registroinstruccionformal == true) {
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

async function verificartitulostercernivel(cedula, callback) {
    var listatitulosdinardap = [];
    var datos = {};
    try {
        var titulosdinardapsenescyt = await new Promise(resolve => { serviciodinardapsenescyt(cedula, (err, valor) => { resolve(valor); }) });
        if (titulosdinardapsenescyt != null) {
            for (titulosenescyt of titulosdinardapsenescyt) {
                console.log(titulosenescyt.nivel)
                if (titulosenescyt.nivel == 3) { datos = titulosenescyt }
            }
            callback(null, datos)
        }
        else { callback(null, null) }
    } catch (err) {
        console.log('Error: ' + err)
        return callback(null)
    }
}

async function consumoinformacionregcivil(cedula, callback) {
    try {
        let listado = [];
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
                            var name = campos.campo;
                            var answer = campos.valor;
                            var parametros = {};
                            parametros[name] = answer;
                            listado.push(parametros);
                        }
                        callback(null, listado);
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo dinardap: ' + err)
            }
        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

async function actualizaciondenombrescentral(nombrecompleto, callback) {
    try {
        let personacentralizada = {};
        var nombrescompletos = "";
        var primerApellido = "";
        var segundoApellido = "";
        const nombres = nombrecompleto.split(" ");
        var pospalabra = [];
        var cont = 0;
        var contpalabracorta = false;
        if (nombres.length > 0) {
            for (var i = 0; i < nombres.length; i++) {
                //if ((nombres[i].includes('DE')) || (nombres[i].includes('DEL')) || (nombres[i].includes('EL')) || (nombres[i].includes('LA')) || (nombres[i].includes('LOS')) || (nombres[i].includes('LAS'))) {
                if (nombres[i].length <= 3) {
                    //if ((nombres[i].includes('DE')) || (nombres[i].includes('DEL')) || (nombres[i].includes('EL')) || (nombres[i].includes('LA')) || (nombres[i].includes('LOS')) || (nombres[i].includes('LAS'))) {
                    if ((nombres[i] == 'DE') || (nombres[i] == 'DEL') || (nombres[i] == 'EL') || (nombres[i] == 'LA') || (nombres[i] == 'LOS') || (nombres[i] == 'LAS')) {
                        contpalabracorta = true
                        if (nombres[i + 1].length <= 3) {
                            contpalabracorta = true
                            pospalabra[cont] = nombres[i] + ' ' + nombres[i + 1] + ' ' + nombres[i + 2]
                            i = i + 2
                        }
                        else {
                            pospalabra[cont] = nombres[i] + ' ' + nombres[i + 1]
                            i = i + 1
                        }
                    } else {
                        pospalabra[cont] = nombres[i];
                    }
                }
                else {
                    pospalabra[cont] = nombres[i];
                }
                cont = cont + 1;
            }
            if (pospalabra.length < 4) {
                if (contpalabracorta == true) {
                    primerApellido = pospalabra[0]
                    segundoApellido = ''
                    for (var c = 1; c < pospalabra.length; c++) {
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
            //var actualizarregistro = await new Promise(resolve => { centralizada.modificarnombrespersona(primerApellido, segundoApellido, nombrescompletos, idpersona, (err, valor) => { resolve(valor); }) });
            callback(null, personacentralizada)
        }
        else {
            callback(null, null)
        }
    }
    catch (err) {
        console.log('Error: ' + err)
        callback(null, null)
    }
}

async function traermatriculasperiodovigente(callback) {
    try {
        var Request = require("request");
        var fs = require("fs");
        var http = require("http");
        var https = require("https");
        var cer1 = pathimage.join(
            __dirname,
            "../Certificados/espoch_sectigo_key_2019.key"
        );
        var cer2 = pathimage.join(
            __dirname,
            "../Certificados/STAR_espoch_edu_ec.crt"
        );
        var cer3 = pathimage.join(
            __dirname,
            "../Certificados/STAR_espoch_edu_ec.crt"
        );
        Request.post(
            {
                rejectUnauthorized: false,
                url: "https://swsairest.espoch.edu.ec/api/matriculas",
                json: true,
            },
            function (error, response, body) {
                return callback(true, body);
            }
        );
    } catch (err) {
        console.error("Fallo en la Consulta", err.stack);
        console.log("Error: " + err);
        return callback(false, null);
    }
}

async function consumoservicioregistrocivil(cedula, callback) {
    try {
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
                        console.log('Error consumo servicio: ' + err)
                        callback(null);
                    }
                    else {
                        var listado = []
                        var jsonString = JSON.stringify(result.return);
                        var objjson = JSON.parse(jsonString);
                        let listacamposdinardap = objjson.instituciones[0].datosPrincipales.registros;
                        for (campos of listacamposdinardap) {
                            listado.push(campos);
                        }
                        if (listado.length > 0) {
                            let datospersona = {};
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
                                    const nombres = atr.valor;
                                    var estructuranombres = await new Promise(resolve => { actualizaciondenombrescentral(nombres, (err, valor) => { resolve(valor); }) });
                                    if (estructuranombres != null) {
                                        primerApellido = estructuranombres.per_primerapellido
                                        segundoApellido = estructuranombres.per_segundoapellido
                                        nombrescompletos = estructuranombres.per_nombres
                                    }
                                    else {
                                        console.log("Error al obtener los nombres y apellidos estructurados")
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
                                            var objciudad = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('ciudad', 'ciu_nombre', ciudad, (err, valor) => { resolve(valor); }) });
                                            if (objciudad.length > 0) {
                                                idciudad = objciudad[0].ciu_id;
                                            }
                                            var objparroquia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('parroquia', 'prq_nombre', parroquia, (err, valor) => { resolve(valor); }) });
                                            if (objparroquia.length > 0) {
                                                idparroquia = objparroquia[0].prq_id;
                                            }
                                            var objprovincia = await new Promise(resolve => { centralizada.obtenerdatosdadonombredelatablayelcampo('provincia', 'pro_nombre', provincia, (err, valor) => { resolve(valor); }) });
                                            if (objprovincia.length > 0) {
                                                idprovincia = objprovincia[0].pro_id;
                                            }
                                        } else {
                                            console.log(lugarNacimiento)
                                            var objpais = await new Promise(resolve => { centralizada.obtenerpaisdadonombre(provincia, (err, valor) => { resolve(valor); }) });
                                            if (objpais != null) {
                                                idprovincia = objpais[0].pai_id;
                                            }
                                            else {
                                                idprovincia = 1;
                                            }
                                            var idciudad = 1;
                                            var idparroquia = 1;
                                        }
                                        var procedenciapersona = idprovincia + '|' + idciudad + '|' + idparroquia;
                                        var lugarprocedencia = idparroquia;
                                        if (idparroquia == 1) {
                                            lugarprocedencia = idprovincia
                                            console.log(procedenciapersona)
                                        }
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
                                datospersona = {
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
                            callback(null, datospersona)
                        }
                        else {
                            console.log('Error en listado de campos dinardap: ')
                            callback(null, null);
                        }
                    }
                });
            } else {
                callback(null, null);
                console.log('Error consumo dinardap: ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null, null);
    }
}

async function reportematriculadosExcel(
    listado,
    callback
) {
    try {
        if (listado.length > 0) {
            var datosarray = [['No', 'Período', 'Codigo Carrera', 'Carrera', 'Codigo Facultad', 'Facultad', 'Sede', 'Nivel', 'Código Estudiante', 'Cédula', 'Apellidos y Nombres', 'Email Institucional', 'Email Personal', 'Teléfono', 'Sexo', 'Genero', 'País de Origen', 'Provincia', 'Ciudad', 'Parroquia']];
            for (estudiante of listado) {
                datosarray.push([estudiante.contador, estudiante.periodo, estudiante.codcarrera, estudiante.carrera, estudiante.codfacultad, estudiante.facultad, estudiante.sede, estudiante.nivel, estudiante.codigoestudiante, estudiante.cedula, estudiante.nombres, estudiante.emailinstitucional, estudiante.emailpersonal, estudiante.celular, estudiante.sexo, estudiante.genero, estudiante.nacionalidad, estudiante.provincia, estudiante.ciudad, estudiante.parroquia])
            }
            generateExcelBase64(datosarray)
                .then((base64String) => {
                    // Puedes enviar o guardar la cadena base64 según tus necesidades
                    return callback(null, base64String);
                })
                .catch((error) => {
                    console.error('Error:', error);
                    return callback(null, false);
                });

        } else {
            return callback(null, false);
        }
    } catch (err) {
        console.log("Error: " + err);
        return callback(null, false);
    }
}

async function reportematriculadosExcelPersonalizado(
    listado,
    callback
) {
    try {
        if (listado.length > 0) {
            var datosarray = [['No', 'Período', 'FechasPeriodo', 'Codigo Carrera', 'Carrera', 'Codigo Facultad', 'Facultad', 'Sede', 'Nivel', 'Código Estudiante', 'Cédula', 'Apellidos y Nombres', 'Email Institucional', 'Email Personal', 'Fecha Nacimiento', 'Teléfono', 'Sexo', 'Genero', 'Etnia', 'País de Origen', 'Provincia', 'Ciudad', 'Parroquia', 'Direccion Residencia']];
            for (estudiante of listado) {
                datosarray.push([estudiante.contador, estudiante.periodo, estudiante.fechasperiodo, estudiante.codcarrera, estudiante.carrera, estudiante.codfacultad, estudiante.facultad, estudiante.sede, estudiante.nivel, estudiante.codigoestudiante, estudiante.cedula, estudiante.nombres, estudiante.emailinstitucional, estudiante.emailpersonal, estudiante.fechanacimiento, estudiante.celular, estudiante.sexo, estudiante.genero, estudiante.etnia, estudiante.nacionalidad, estudiante.provincia, estudiante.ciudad, estudiante.parroquia, estudiante.direccion])
            }
            generateExcelBase64(datosarray)
                .then((base64String) => {
                    // Puedes enviar o guardar la cadena base64 según tus necesidades
                    return callback(null, base64String);
                })
                .catch((error) => {
                    console.error('Error:', error);
                    return callback(null, false);
                });

        } else {
            return callback(null, false);
        }
    } catch (err) {
        console.log("Error: " + err);
        return callback(null, false);
    }
}

async function generateExcelBase64(dataArray) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Agregar datos al archivo Excel
    dataArray.forEach((row) => {
        worksheet.addRow(row);
    });

    // Generar el archivo Excel en memoria
    const buffer = await workbook.xlsx.writeBuffer();

    // Convertir a base64
    const base64String = base64.fromByteArray(buffer);

    return base64String;
}

async function consumodinardapMSP(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoMSP;
        const args =
        {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "cedula", valor: cedula }
                ]
            }
        };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.consultar(args, async function (err, result) {
                    if (err) {
                        console.log('Error: ' + err)
                        callback(null);
                    }
                    else {
                        var jsonString = JSON.stringify(result.paquete);
                        var objjson = JSON.parse(jsonString);
                        let listacamposdiscapacidad = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposdiscapacidad) {
                            listado.push(campos);
                        }
                        var codigoconadis = ''
                        var idorganizacion = 1
                        var tipodiscapacidad = ''
                        for (atr of listado) {
                            if (atr.campo == "codigoConadis") {
                                codigoconadis = atr.valor;
                                if (codigoconadis.includes('.')) {
                                    idorganizacion = 2
                                }
                                else {
                                    idorganizacion = 3
                                }
                            }
                            if (atr.campo == "tipoDiscapacidadPredomina") {
                                tipodiscapacidad = atr.valor
                            }
                        }
                        var discapacidad = {
                            codigoconadis: codigoconadis,
                            idorganizacion: idorganizacion,
                            tipodiscapacidad: tipodiscapacidad
                        }
                        callback(discapacidad)
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo dinardap: ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

module.exports = router;