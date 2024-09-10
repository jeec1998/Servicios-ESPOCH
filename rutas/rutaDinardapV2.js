const { ejecutarConsultaSQLcontransacion } = require("./../config/ejecucion.js");
const { Pool } = require("pg");
const express = require('express');
const router = express.Router();
const soap = require('soap');
const jwt_decode = require('jwt-decode');
const UrlAcademico = require('../config/urlAcademico');
const pathimage = require('path')
const nomenclatura = require('../config/nomenclatura');
const { Console, dir } = require('console');
const urlAcademico = require('../config/urlAcademico');
const centralizada = require('../modelo/centralizada');
const administracion = require('../modelo/administracion');
const sql = require('mssql');
const e = require('express');
const base64 = require('base64-js');
const ExcelJS = require('exceljs');
const bd = require("../config/baseMaster");
var cron = require('node-cron');
const { list } = require("pdfkit");

/*Get
*/
router.get('/consumodinardapSRICompletoindividual/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var success = false;
    var telefonoDomicilio = '';
    var direccionLarga = '';

    try {
        var datosSRICompleto = await new Promise(resolve => { 
            consumodinardapSRICompleto(cedula, (valor) => { 
                resolve(valor); 
            }); 
        });

        if (datosSRICompleto != null) {
            telefonoDomicilio = datosSRICompleto.telefonoDomicilio;
            direccionLarga = datosSRICompleto.direccionLarga;
            success = true;
        }

        return res.json({
            success: success,
            telefonoDomicilio: telefonoDomicilio,
            direccionLarga: direccionLarga
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false,
            message: 'Error al procesar la solicitud.'
        });
    }
});

/* ****************************************************************************************
Get de los servicios SOAP SRI 
*/
router.get('/consumodinardapSRICompleto/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriCompleto = [];
    var success = false;
    try {
        var datosSRICompleto = await new Promise(resolve => { consumodinardapSRICompleto(cedula, (valor) => { resolve(valor); }) });
        if (datosSRICompleto != null) {
            sriCompleto = datosSRICompleto;
            success = true;
        }
        return res.json({
            success: success,
            listado: sriCompleto
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/consumodinardapSRIContactos/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriContactos = [];
    var success = false;
    try {
        var datosSRIContactos = await new Promise(resolve => { consumodinardapSRIContactos(cedula, (valor) => { resolve(valor); }) });
        if (datosSRIContactos != null) {
            sriContactos = datosSRIContactos;
            success = true;
        }
        return res.json({
            success: success,
            listado: sriContactos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/consumodinardapSRIDatos/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriDatos = [];
    var success = false;
    try {
        var datosSRIDatos = await new Promise(resolve => { consumodinardapSRIDatos(cedula, (valor) => { resolve(valor); }) });
        if (datosSRIDatos != null) {
            sriDatos = datosSRIDatos;
            success = true;
        }
        return res.json({
            success: success,
            listado: sriDatos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/consumoESPOCHMSP/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    let ESPOCHMSP = [];
    let success = false;

    try {
        const espochMSP = await new Promise(resolve => {consumoESPOCHMSP(cedula, valor => resolve(valor)); });

        if (espochMSP.mensaje) {
            return res.json({
                success: success,
                mensaje: espochMSP.mensaje
            });
        }

        if (espochMSP.codigoConadis) {
            success = true;
            return res.json({
                success: success,
                listado: espochMSP
            });
        }
        return res.json({
            success: false,
            mensaje: 'No se encontraron datos para la cédula proporcionada.'
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
router.get('/consumodinardapSRIGenral1/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriGeneral = [];
    var success = false;
    try {
        var datosSRIGeneral = await new Promise(resolve => { consumodinardapSRIGeneral(cedula, (valor) => { resolve(valor); }) });
        if (datosSRIGeneral != null) {
            sriGeneral = datosSRIGeneral;
            success = true;
        }
        return res.json({
            success: success,
            listado: sriGeneral
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
/* ****************************************************************************************
Informacion Unida 
 */
router.get('/consumodinardapSRICompletoDatosContactos/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriGeneral = [];
    var sriCompleto = [];
    var sriContactos = [];
    var sriDatos = [];
    var success = false;
    
    
    try {
        var datosSRIGeneral = await new Promise(resolve => { 
            consumodinardapSRIGeneral(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRICompleto = await new Promise(resolve => { 
            consumodinardapSRICompleto(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIContactos = await new Promise(resolve => { 
            consumodinardapSRIContactos(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIDatos = await new Promise(resolve => { 
            consumodinardapSRIDatos(cedula, (valor) => { resolve(valor); }) 
        });
        
        if (datosSRIGeneral || datosSRICompleto || datosSRIContactos || datosSRIDatos) {
            
            sriGeneral = datosSRIGeneral || [];
            sriCompleto = datosSRICompleto || [];
            sriContactos = datosSRIContactos || [];
            sriDatos = datosSRIDatos || [];
            success = true;
        }
        
        return res.json({
            success: success,
            general: sriGeneral,
            completo: sriCompleto,
            contactos: sriContactos,
            datos: sriDatos
        });
    } catch (err) {
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});

/* ***************************************************************************************
Unida e individual
*/
router.get('/consumodinardapSRIGeneralCompleto/:cedula', async (req, res) => {
    const cedula = req.params.cedula;

    var telefonoDomicilio = '';
    var direccionLarga = '';
    var telefonoDomicilioR = '';
    var idRepresentanteLegal = '';
    var numeroRuc = '';
    var personaSociedad = '';
    var razonSocial = '';
    var nombreFantasiaComercial = '';
    var actividadEconomicaPrincipa = '';
    var success = true;
    
    
    try {
        var datosSRIGeneral = await new Promise(resolve => { 
            consumodinardapSRIGeneral(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRICompleto = await new Promise(resolve => { 
            consumodinardapSRICompleto(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIContactos = await new Promise(resolve => { 
            consumodinardapSRIContactos(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIDatos = await new Promise(resolve => { 
            consumodinardapSRIDatos(cedula, (valor) => { resolve(valor); }) 
        });
        if (datosSRIGeneral || datosSRICompleto || datosSRIContactos || datosSRIDatos) {
            
            telefonoDomicilio = datosSRICompleto.telefonoDomicilio ;
            direccionLarga = datosSRICompleto.direccionLarga;
            telefonoDomicilioR = datosSRIContactos.telefonoDomicilioR;
            idRepresentanteLegal = datosSRIDatos.idRepresentanteLegal;
            numeroRuc = datosSRIGeneral.numeroRuc;
            personaSociedad = datosSRIGeneral.personaSociedad;
            razonSocial = datosSRIGeneral.razonSocial;
            nombreFantasiaComercial = datosSRIGeneral.nombreFantasiaComercial;
            actividadEconomicaPrincipa = datosSRIGeneral.actividadEconomicaPrincipa;
        }
        
        return res.json({
            success: success,
            numeroRuc: numeroRuc,
            personaSociedad: personaSociedad,
            razonSocial: razonSocial,
            nombreFantasiaComercial: nombreFantasiaComercial,
            actividadEconomicaPrincipa: actividadEconomicaPrincipa,
            telefonoDomicilio: telefonoDomicilio,
            direccionLarga: direccionLarga,
            telefonoDomicilioR: telefonoDomicilioR,
            idRepresentanteLegal: idRepresentanteLegal
        });
    } catch (err) {
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});
/* **************************************************************************************** 
Utilización de servicios SOAP del SRI
*/
async function consumodinardapSRICompleto(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRICompleto;
        const args =
        {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula },
                    { nombre: "fuenteDatos", valor: " "}
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
                        let listacampossricompletos = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacampossricompletos) {
                            listado.push(campos);
                        }
                        var telefonoDomicilio = ''
                        var direccionLarga = ''
                        for (atr of listado) {
                            if (atr.campo == "telefonoDomicilio") {
                                telefonoDomicilio = atr.valor;
                            }
                            if (atr.campo == "direccionLarga") {
                                direccionLarga = atr.valor
                            }
                        }
                        var sriCompleto = {
                            telefonoDomicilio: telefonoDomicilio,
                            direccionLarga: direccionLarga
                        }
                        
                        callback(sriCompleto)
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

async function consumodinardapSRIContactos(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRIContactos;
        const args =
        {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula }
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
                        let listacampossricontactos = objjson.entidades.entidad[6].filas.fila[0].columnas.columna;
                        
                        for (campos of listacampossricontactos) {
                            listado.push(campos);
                        }
                        var telefonoDomicilioR = ''
                        for (atr of listado) {
                            if (atr.campo == "telefonoDomicilioMedCon") {
                                telefonoDomicilioR = atr.valor;
                            }
                        }
                        var sriContactos = {
                            telefonoDomicilioR: telefonoDomicilioR
                        }
                        callback(sriContactos)
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
async function consumodinardapSRIDatos(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRIDatos;
        const args =
        {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula }
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
                        let listacampossridatos = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacampossridatos) {
                            listado.push(campos);
                        }
                        var idRepresentanteLegal = ''
                        for (atr of listado) {
                           
                            } if (atr.campo == "idRepreLegal") {
                                idRepresentanteLegal = atr.valor;
                            }
                        
                        var sriDatos = {
                            idRepresentanteLegal: idRepresentanteLegal
                        }
                        callback(sriDatos)
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
async function consumodinardapSRIGeneral(cedula, callback) {
    var url = UrlAcademico.urlwsdl;
    var Username = urlAcademico.usuariodinardap;
    var Password = urlAcademico.clavedinardap;
    var codigopaquete = urlAcademico.codigoSRIGeneral;
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
                    let listacamposdinardapsrigeneral = objjson.instituciones[0].datosPrincipales.registros;
                    console.log(listacamposdinardapsrigeneral)
                    for (campos of listacamposdinardapsrigeneral) {
                        listado.push(campos);
                    }
                    var numeroRuc = ''
                    var personaSociedad = ''
                    var razonSocial = ''
                    var nombreFantasiaComercial = ''
                    var actividadEconomicaPrincipal = ''
                    for (atr of listado) {
                         if (atr.campo == "numeroRuc") {
                            numeroRuc = atr.valor;
                        }
                        if (atr.campo == "personaSociedad") {
                            personaSociedad = atr.valor;
                        }
                        if (atr.campo == "razonSocial") {
                            razonSocial = atr.valor;
                        }
                        if (atr.campo == "nombreFantasiaComercial") {
                            nombreFantasiaComercial = atr.valor;
                        }
                        if (atr.campo == "actividadEconomicaPrincipal") {
                            actividadEconomicaPrincipal = atr.valor;
                        }
                    }
                        console.log(numeroRuc)
                    var sriGeneral = {
                        numeroRuc: numeroRuc,
                        personaSociedad: personaSociedad,
                        razonSocial: razonSocial,
                        nombreFantasiaComercial: nombreFantasiaComercial,
                        actividadEconomicaPrincipal: actividadEconomicaPrincipal
                    }
                    callback(sriGeneral)
                
            }
            });
        } else {
            callback(null, null);
            console.log('Error consumo dinardap: ' + err)
        }

    }
    );
}
async function consumoESPOCHMSP(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoESPOCHMSP;
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
                        let listacamposESPOCHMSP = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposESPOCHMSP) {
                            listado.push(campos);
                        }
                        
                        var codigoConadis = ''
                        var tipoDiscapacidadPredomina=''
                        var gradoDiscapacidad = ''
                        var porcentajeDiscapacidad = ''
                        for (atr of listado) {
                            if (atr.campo == "codigoConadis") {
                                codigoConadis = atr.valor;
                            }
                            if (atr.campo == "tipoDiscapacidadPredomina"){
                                tipoDiscapacidadPredomina = atr.valor;
                            }
                            if(atr.campo == "gradoDiscapacidad"){
                                gradoDiscapacidad = atr.valor;
                            }
                            if(atr.campo == "porcentajeDiscapacidad"){
                                porcentajeDiscapacidad = atr.valor;
                            }
                        }
                        var espochMSP = {
                            codigoConadis: codigoConadis,
                            tipoDiscapacidadPredomina: tipoDiscapacidadPredomina,
                            gradoDiscapacidad: gradoDiscapacidad,
                            porcentajeDiscapacidad: porcentajeDiscapacidad,
                        }
                        callback(espochMSP)
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo ESPOCH-MSP: ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
module.exports = router;