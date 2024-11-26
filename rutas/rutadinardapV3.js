const { ejecutarConsultaSQLcontransacion } = require("./../config/ejecucion.js");
const { Pool } = require("pg");
const express = require('express');
const db = require('../config/databasecentral');
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
const actualizarV2 = require('./../modelo/actualizarV2');
/* Obtener Biometria (Imagen) */
router.get('/ObtenerBiometria2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadoFinal = {};

    try {
       
        let personaImagen = await transaccioncentral.query(
            `SELECT imagen FROM central.personaimagen p
             JOIN central."documentoPersonal" u ON p.per_id = u.per_id
             WHERE u.pid_valor = $1`, [cedula]
        );

       
        if (personaImagen.rows.length > 0 && personaImagen.rows[0].imagen) {
            resultadoFinal = {
                success: true,
                imagen: personaImagen.rows[0].imagen
            };
        } else {
           
            const reportebase64 = await new Promise(resolve => {
                consumodinardapESPOCH_DIGERIC_Biometrico1(cedula, valor => resolve(valor));
            });
            
            if (reportebase64) {
                try {
                    
                    const query = `
                        UPDATE central.personaimagen SET imagen = $1
                        WHERE per_id = (SELECT per_id FROM central."documentoPersonal" WHERE pid_valor = $2)
                    `;
                    const datosImagen = await transaccioncentral.query(query, [reportebase64, cedula]);
                    
                    if (datosImagen.rowCount > 0) {
                        resultadoFinal = {
                            success: true,
                            imagen: reportebase64
                        };
                        console.log("Imagen actualizada correctamente.");
                    } else {
                        console.log("No se pudo actualizar la imagen.");
                        resultadoFinal = {
                            success: false,
                            mensaje: "No se pudo actualizar la imagen en la base de datos."
                        };
                    }
                } catch (error) {
                    console.error("Error durante la actualización de la imagen:", error);
                    resultadoFinal = {
                        success: false,
                        mensaje: "Error al actualizar la imagen en la base de datos."
                    };
                }
            } else {
                resultadoFinal = {
                    success: false,
                    mensaje: "No se encontró imagen para la cédula proporcionada."
                };
            }
        }

        return res.json(resultadoFinal);
    } catch (err) {
        console.error("Error al obtener la imagen:", err);
        return res.json({
            success: false,
            mensaje: "Error al procesar la solicitud."
        });
    } finally {
        await transaccioncentral.release();
    }
});
async function consumodinardapESPOCH_DIGERIC_Biometrico1(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.ESPOCH_DIGERCIC_Biometrico;
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
                        console.log('Error: ' + err);
                        callback(null);
                    } else {
                        var jsonString = JSON.stringify(result.paquete);
                        var objjson = JSON.parse(jsonString);
                        let listacamposbiometricos = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposbiometricos) {
                            listado.push(campos);
                        }
                        var foto= '';
                        for (atr of listado) {
                            if (atr.campo == "foto") {
                                foto = atr.valor;
                            }                

                        }
                        var datosBiometricos = {
                            foto: foto,
                        };
                        callback(datosBiometricos); 
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo : ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
/* ESPOCHMSP consumo de servicio Discapacidad */
router.get('/consumoESPOCHMSP2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    let ESPOCHMSP = [];
    let success = false;

    try {
        const espochMSP = await new Promise(resolve => {consumoESPOCHMSP2(cedula, valor => resolve(valor)); });

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
/* Actualizar la discapacidad por medio de la cedula  */
router.patch('/actualizacionDiscapacidad2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    let reportebase64 = '';
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];
    try {
        var personadiscapacitada = await new Promise((resolve, reject) => {
            actualizarV2.discapacidad(cedula, (err, valor) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(valor);
                }
            });
        }).catch(err => {
            console.error("Error al obtener personadiscapacitada:", err);
        });
        
        if (personadiscapacitada.length > 0) {
            for (const persona of personadiscapacitada) {
                const cedula = persona.pid_valor;
                let success = false;
                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP2(cedula, valor => resolve(valor));
                    });
                    if(persona.dis_valor != espochMSP.porcentajeDiscapacidad){
                        const carnet = persona.cdi_numero;
                        const nuevoPorcentajeDiscapacidad = espochMSP.porcentajeDiscapacidad;

                        try {
                            const query =`
                                UPDATE central.discapacidad d 
                                SET dis_valor = $1 
                                FROM central."carnetDiscapacidad" c 
                                WHERE d.cdi_id = c.cdi_id 
                                AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoPorcentajeDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Porcentaje de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoPorcentajeDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el porcentaje de discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                    if (persona.dis_grado != espochMSP.gradoDiscapacidad) {
                        const nuevoGradoDiscapacidad = espochMSP.gradoDiscapacidad;
                        const carnet = persona.cdi_numero;
                        try {
                            const query = `
                             UPDATE central.discapacidad d
                             SET dis_grado = $1 
                             FROM central."carnetDiscapacidad" c
                             WHERE d.cdi_id = c.cdi_id
                              AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoGradoDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Grado de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoGradoDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el grado de discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                    
                    if (persona.tdi_nombre != espochMSP.tipoDiscapacidadPredomina) {
                        const nuevoTipoDiscapacidad = espochMSP.tipoDiscapacidadPredomina;
                        const carnet = persona.cdi_numero;
                        try {
                            const query = `
                            UPDATE central.discapacidad d
                            SET tdi_id = (
                            SELECT t.tdi_id 
                            FROM central."tipoDiscapacidad" t 
                            WHERE t.tdi_nombre = $1
                            )   
                            FROM central."carnetDiscapacidad" c
                            WHERE d.cdi_id = c.cdi_id
                            AND c.cdi_numero = $2;
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoTipoDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Tipo de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoTipoDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el Tipo de Discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                   
                    if (persona.cdi_numero != espochMSP.codigoConadis) {
            
                        const nuevocarntetDiscapacidad = espochMSP.codigoConadis;
                        const personaID = persona.per_id;
                        try {
                            const query = `
                            UPDATE central."carnetDiscapacidad" c
                            SET cdi_numero = $1
                            WHERE c.per_id = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevocarntetDiscapacidad, personaID]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Carnet de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    nuevocarntetDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el Carnet de Discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                } catch (err) {
                    console.log('Error con cedula: ' + cedula + ', Error: ' + err);
                    resultadosFinales.push({
                        success: false,
                        BaseDatos: persona,
                        mensaje: 'Error al procesar los datos para la cédula proporcionada.'
                    });
                }
            }
            return res.json({
                success: true,
                listado: resultadosFinales
            });
        } else {
            return res.json({
                success: false,
                listado: []
            });
        }
        } catch (err) {
        console.error('Error: ', err);
        return res.json({
            success: false,
            mensaje: 'Error al procesar la solicitud.'
        });
    } finally {
        await transaccioncentral.release();
    }
}); 
/* Actualizar porcentaje de discapacidad */
router.patch('/actualizacionDiscapacidadPorcentaje2', async (req, res) => {
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];

    try {
        const personadiscapacitada = await new Promise((resolve, reject) => {
            actualizarV2.obtenerdiscapacidad((err, valor) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(valor);
                }
            });
        });
        if (personadiscapacitada.length > 0) {
            const personasLimitadas = personadiscapacitada.slice(0, 10);

            for (const persona of personasLimitadas) {
                const cedula = persona.pid_valor;
                let success = false;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP2(cedula, valor => resolve(valor));
                    });
                    if (persona.dis_valor === 0) {
                        success = true;
                        const carnet = persona.cdi_numero;
                        const nuevoPorcentajeDiscapacidad = espochMSP.porcentajeDiscapacidad;

                        try {
                            const query =`
                                UPDATE central.discapacidad d 
                                SET dis_valor = $1 
                                FROM central."carnetDiscapacidad" c 
                                WHERE d.cdi_id = c.cdi_id 
                                AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoPorcentajeDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Porcentaje de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoPorcentajeDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el porcentaje de discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                        if (persona.dis_grado === null) {
                            success = true;
                            const carnet = persona.cdi_numero;
                            const nuevoGradoDiscapacidad = espochMSP.gradoDiscapacidad;
    
                            try {
                                const query = `
                                 UPDATE central.discapacidad d
                                 SET dis_grado = $1 
                                 FROM central."carnetDiscapacidad" c
                                 WHERE d.cdi_id = c.cdi_id
                                  AND c.cdi_numero = $2
                                `;
                                const datosdiscapacidad = await transaccioncentral.query(query, [nuevoGradoDiscapacidad, carnet]);
    
                                if (datosdiscapacidad.rowCount > 0) {
                                    console.log("Grado de discapacidad actualizado correctamente.");
                                    resultadosFinales.push({
                                        success: true,
                                        carnet,
                                        nuevoGradoDiscapacidad
                                    });
                                } else {
                                    console.log("No se pudo actualizar el grado de discapacidad.");
                                }
                            } catch (error) {
                                console.error("Error durante la actualización:", error);
                            }
                        }
                } catch (err) {
                    console.log('Error con cedula: ' + cedula + ', Error: ' + err);
                    resultadosFinales.push({
                        success: false,
                        BaseDatos: persona,
                        mensaje: 'Error al procesar los datos para la cédula proporcionada.'
                    });
                }
            }

            return res.json({
                success: true,
                listado: resultadosFinales
            });
        } else {
            return res.json({
                success: false,
                listado: []
            });
        }
    } catch (err) {
        console.error('Error: ', err);
        await transactionmigracion.rollback();
        await poolmigracion.close();
        await transaccioncentral.end();
        return res.json({
            success: false,
            mensaje: 'Error al procesar la solicitud.'
        });
    } finally {
        await transaccioncentral.release();
    }
});
/* Actualizar toda la base de datos la discapacidad */
router.patch('/actualizacionDiscapacidadTodo2', async (req, res) => {
    let reportebase64 = '';
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];

    try {
        const personadiscapacitada = await new Promise((resolve, reject) => {
            actualizarV2.obtenerdiscapacidad((err, valor) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(valor);
                }
            });
        });

        if (personadiscapacitada.length > 0) {
            const personasLimitadas = personadiscapacitada.slice(0, 10);
            for (const persona of personasLimitadas) {
                const cedula = persona.pid_valor;
                let success = false;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP2(cedula, valor => resolve(valor));
                    });
                    if(persona.dis_valor != espochMSP.porcentajeDiscapacidad){
                        const carnet = persona.cdi_numero;
                        const nuevoPorcentajeDiscapacidad = espochMSP.porcentajeDiscapacidad;

                        try {
                            const query =`
                                UPDATE central.discapacidad d 
                                SET dis_valor = $1 
                                FROM central."carnetDiscapacidad" c 
                                WHERE d.cdi_id = c.cdi_id 
                                AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoPorcentajeDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Porcentaje de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoPorcentajeDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el porcentaje de discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                    if (persona.dis_grado != espochMSP.gradoDiscapacidad) {
                        const nuevoGradoDiscapacidad = espochMSP.gradoDiscapacidad;
                        const carnet = persona.cdi_numero;
                        try {
                            const query = `
                             UPDATE central.discapacidad d
                             SET dis_grado = $1 
                             FROM central."carnetDiscapacidad" c
                             WHERE d.cdi_id = c.cdi_id
                              AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoGradoDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Grado de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoGradoDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el grado de discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                    
                    if (persona.tdi_nombre != espochMSP.tipoDiscapacidadPredomina) {
                        const nuevoTipoDiscapacidad = espochMSP.tipoDiscapacidadPredomina;
                        const carnet = persona.cdi_numero;
                        try {
                            const query = `
                            UPDATE central.discapacidad d
                            SET tdi_id = (
                            SELECT t.tdi_id 
                            FROM central."tipoDiscapacidad" t 
                            WHERE t.tdi_nombre = $1
                            )   
                            FROM central."carnetDiscapacidad" c
                            WHERE d.cdi_id = c.cdi_id
                            AND c.cdi_numero = $2;
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoTipoDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Tipo de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoTipoDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el Tipo de Discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                   console.log(espochMSP.codigoConadis)
                    if (persona.cdi_numero != espochMSP.codigoConadis) {
            
                        const nuevocarntetDiscapacidad = espochMSP.codigoConadis;
                        const personaID = persona.per_id;
                        try {
                            const query = `
                            UPDATE central."carnetDiscapacidad" c
                            SET cdi_numero = $1
                            WHERE c.per_id = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevocarntetDiscapacidad, personaID]);

                            if (datosdiscapacidad.rowCount > 0) {
                                console.log("Carnet de discapacidad actualizado correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    personaID,
                                    nuevocarntetDiscapacidad
                                });
                            } else {
                                console.log("No se pudo actualizar el Carnet de Discapacidad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                } catch (err) {
                    console.log('Error con cedula: ' + cedula + ', Error: ' + err);
                    resultadosFinales.push({
                        success: false,
                        BaseDatos: persona,
                        mensaje: 'Error al procesar los datos para la cédula proporcionada.'
                    });
                }
            }
            return res.json({
                success: true,
                listado: resultadosFinales
            });
        } else {
            return res.json({
                success: false,
                listado: []
            });
        }
    } catch (err) {
        console.error('Error: ', err);
        return res.json({
            success: false,
            mensaje: 'Error al procesar la solicitud.'
        });
    } finally {
        await transaccioncentral.release();
    }
});
async function consumoESPOCHMSP2(cedula, callback) {
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
/* SRI GENERAL */
router.get('/consumodinardapSRIGenral2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriGeneral = [];
    var success = false;
    try {
        var datosSRIGeneral = await new Promise(resolve => { consumodinardapSRIGeneral2(cedula, (valor) => { resolve(valor); }) });
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
async function consumodinardapSRIGeneral2(cedula, callback) {
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
/* Servicio del SRI completo de una sola persona por medio de su cedula */
router.get('/consumodinardapSRICompleto2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriCompleto = [];
    var success = false;
    try {
        var datosSRICompleto = await new Promise(resolve => { consumodinardapSRICompleto2(cedula, (valor) => { resolve(valor); }) });
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
async function consumodinardapSRICompleto2(cedula, callback) {
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
/* SRI Contactos  */
router.get('/consumodinardapSRIContactos2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriContactos = [];
    var success = false;
    try {
        var datosSRIContactos = await new Promise(resolve => { consumodinardapSRIContactos2(cedula, (valor) => { resolve(valor); }) });
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
async function consumodinardapSRIContactos2(cedula, callback) {
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
/* SRI Datos */
router.get('/consumodinardapSRIDatos2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriDatos = [];
    var success = false;
    try {
        var datosSRIDatos = await new Promise(resolve => { consumodinardapSRIDatos2(cedula, (valor) => { resolve(valor); }) });
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
async function consumodinardapSRIDatos2(cedula, callback) {
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
                           
                            if (atr.campo == "idRepreLegal") {
                                idRepresentanteLegal = atr.valor;
                            }
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
/* Servicios de SRI unidos  */
router.get('/consumodinardapSRICompletoDatosContactos2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var sriGeneral = [];
    var sriCompleto = [];
    var sriContactos = [];
    var sriDatos = [];
    var success = false;
    
    
    try {
        var datosSRIGeneral = await new Promise(resolve => { 
            consumodinardapSRIGeneral2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRICompleto = await new Promise(resolve => { 
            consumodinardapSRICompleto2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIContactos = await new Promise(resolve => { 
            consumodinardapSRIContactos2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIDatos = await new Promise(resolve => { 
            consumodinardapSRIDatos2(cedula, (valor) => { resolve(valor); }) 
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
/* Servicios unidos pero la infromacion esta separada */
router.get('/consumodinardapSRIGeneralCompleto2/:cedula', async (req, res) => {
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
            consumodinardapSRIGeneral2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRICompleto = await new Promise(resolve => { 
            consumodinardapSRICompleto2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIContactos = await new Promise(resolve => { 
            consumodinardapSRIContactos2(cedula, (valor) => { resolve(valor); }) 
        });
        var datosSRIDatos = await new Promise(resolve => { 
            consumodinardapSRIDatos2(cedula, (valor) => { resolve(valor); }) 
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
/* DATOS DEMOGRAFICOS */
router.get('/cosnumodinardapDatosDomiciliarios2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosDemograficos = [];
    var success = false;
    try {
        var datosdomiciliarios = await new Promise(resolve => { consumodinardapESPOCH_DIGERIC_DEMOGRAFICO2(cedula, (valor) => { resolve(valor); }) });
        if (datosdomiciliarios != null) {
            datosDemograficos = datosdomiciliarios;
            success = true;
        }
        return res.json({
            success: success,
            listado: datosDemograficos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function consumodinardapESPOCH_DIGERIC_DEMOGRAFICO2(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.ESPOCH_DIGERCIC_Demografico;
        const args = {
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
                        console.log('Error: ' + err);
                        callback(null);
                    } else {
                        var jsonString = JSON.stringify(result.paquete);
                        var objjson = JSON.parse(jsonString);
                        let listacamposdemografico = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposdemografico) {
                            listado.push(campos);
                        }
                        var callesDomicilio = '';
                        for (atr of listado) {
                            if (atr.campo == "callesDomicilio") {
                                callesDomicilio = atr.valor;
                            }
                            if (atr.campo == "domicilio") {
                                domicilio = atr.valor;
                            }
                            if (atr.campo == "estadoCivil") {
                                estadoCivil = atr.valor;
                            }
                            if (atr.campo == "fechaNacimiento") {
                                fechaNacimiento = atr.valor;
                            }
                            if (atr.campo == "genero") {
                                genero = atr.valor;
                            }
                            if (atr.campo == "lugarNacimiento") {
                                lugarNacimiento = atr.valor;
                            }
                            if (atr.campo == "nacionalidad") {
                                nacionalidad = atr.valor;
                            }
                            if (atr.campo == "nombre") {
                                nombre = atr.valor;
                            }
                            if (atr.campo == "numeroCasa") {
                                numeroCasa = atr.valor;
                            }

                        }
                        var datosDemograficos = {
                            Nombre: nombre,
                            Genero: genero,
                            FechaNacimiento: fechaNacimiento,
                            LugarNacimiento: lugarNacimiento,
                            Nacionalida: nacionalidad,
                            EstadoCivil: estadoCivil,
                            Domicilio: domicilio,
                            CallesDelDomicilio: callesDomicilio,
                            NumeroDeCasaDomicilio: numeroCasa,
                        };
                        callback(datosDemograficos); 
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo de los datos Demográficos: ' + err);
            }
        });
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack);
        return callback(null);
    }
}
/* Impedimentos en MDT defectuoso */
router.get('/cosnumodinardapDatosMDT2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosMDT = [];
    var success = false;
    try {
        var datosmdt = await new Promise(resolve => { consumodinardapESPOCH_MDT_Impedimentos2(cedula, (valor) => { resolve(valor); }) });
        if (datosmdt != null) {
            datosMDT = datosmdt;
            success = true;
        }
        return res.json({
            success: success,
            listado: datosMDT
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function consumodinardapESPOCH_MDT_Impedimentos2(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.ESPOCH_MDT_Impedimentos;
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
                        let listacamposdatosMDT = objjson.entidades.entidad[1];
                        for (campos of listacamposdatosMDT) {
                            listado.push(campos);
                        }
                        console.log(listacamposdatosMDT)
                        var Impedimento = ''
                        var fechaImpedimento = ''
                        for (atr of listado) {
                           
                            if (atr.campo == "Impedimento") {
                                Impedimento = atr.valor;
                            }
                            if (atr.campo == "fechaImpedimento") {
                                fechaImpedimento = atr.valor;
                            }
                        }
                        
                        var datosMDT = {
                            Impedimento: Impedimento,
                            fechaImpedimento: fechaImpedimento,
                        }
                        callback(datosMDT)
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
/* minesterio de eduacaion codigo de refrendacion */
router.get('/cosnumodinardapminEducaion2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatos = [];
    var success = false;
    try {
        var datosespoch = await new Promise(resolve => { serviciodinardapminEducacion2(cedula, (err, valor) => { resolve(valor); }) });
        if (datosespoch != null) {
            espochMineduDatos = datosespoch;
            success = true;
        }
        return res.json({
            success: success,
            listado: espochMineduDatos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function serviciodinardapminEducacion2(cedulapersona, callback) {
    let listado = [];
    try {
        let registroministerio = {};
        var codigorefrendacion = 1;;
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
                             
                            if (registro.campo == 'codigoRefrendacion') {
                                codigorefrendacion = registro.valor;
                            }
                        }
                        registroministerio = {
                            codigorefrendacion: codigorefrendacion,
                           
                        }
                        listado.push(registroministerio)
                    }
                    return callback(null, registroministerio)
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
/* consumo de Servicio estudiantes */
router.get('/cosnumodinardapESPOCHMINEDUCEstudiantes2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatosEstudiante = [];
    var success = false;
    try {
        var datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes2(cedula, (valor) => { resolve(valor); }) });
        if (datosespochmineduEstudiantes != null) {
            espochMineduDatosEstudiante = datosespochmineduEstudiantes;
            success = true;
        }
        return res.json({
            success: success,
            listado: espochMineduDatosEstudiante
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function consumodinardapESPOCHMINEDUCEstudiantes2(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoESPOCHMINEDUCEstudiantes;
        var tipo = urlAcademico.tipoCedulaEstudiante;
        const args =
        {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "tipo", valor: tipo },
                    { nombre: "valor", valor: cedula }
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
                        let listacamposEspochMineducEstudainte = objjson.entidades.entidad[0].filas.fila[0].columnas.columna
                        for (campos of listacamposEspochMineducEstudainte) {
                            listado.push(campos);
                        }
                        var provinciaInstitucion = ''
                        var cantonInstitucion = ''
                        var parroquiaInstitucion = ''
                        var amieInstitucion =''
                        var sostenimiento = ''
                        for (atr of listado) {
                            if (atr.campo == "provinciaInstitucion") {
                                provinciaInstitucion = atr.valor;
                            }
                            if (atr.campo == "cantonInstitucion") {
                                cantonInstitucion = atr.valor;
                            }
                            if (atr.campo == "parroquiaInstitucion") {
                                parroquiaInstitucion = atr.valor;
                            }
                            if (atr.campo == "amieInstitucion") {
                                amieInstitucion = atr.valor;
                            } 
                            if (atr.campo == "sostenimiento") {
                                sostenimiento = atr.valor;
                            }                                
                        }
                        
                        var espochMineduDatosEstudiante = {
                            provinciaInstitucion: provinciaInstitucion,
                            cantonInstitucion: cantonInstitucion,
                            parroquiaInstitucion: parroquiaInstitucion,
                            amieInstitucion: amieInstitucion,
                            sostenimiento: sostenimiento
                        }
                        callback(espochMineduDatosEstudiante)
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo : ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
/* consumo completo de estudiantes */
router.get('/consumodinardapESPOCHMINEDUCCompleto2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var success = true;
    var provinciaInstitucion = '';
    var cantonInstitucion = '';
    var parroquiaInstitucion = '';
    var amieInstitucion ='';
    var sostenimiento = '';
    var institucion = '';
    var titulo = '';
    var especialidad = '';
    var fechaGrado ='';
    var codigorefrendacion = ''; 
    
    try {
        var datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC2(cedula, (valor) => { resolve(valor); }) });
        var datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes2(cedula, (valor) => { resolve(valor); }) });
        var registroministerio = await new Promise(resolve => { serviciodinardapminEducacion2(cedula, (err, valor) => { resolve(valor); }) });
        if ( registroministerio || datosespochminedu || datosespochmineduEstudiantes ) {
            codigorefrendacion = registroministerio.codigorefrendacion;
            institucion = datosespochminedu.institucion;
            titulo = datosespochminedu.titulo;
            especialidad = datosespochminedu.especialidad;
            fechaGrado = datosespochminedu.fechaGrado;
            provinciaInstitucion = datosespochmineduEstudiantes.provinciaInstitucion;
            cantonInstitucion = datosespochmineduEstudiantes.cantonInstitucion;
            parroquiaInstitucion = datosespochmineduEstudiantes.parroquiaInstitucion;
            amieInstitucion = datosespochmineduEstudiantes.amieInstitucion;
            sostenimiento = datosespochmineduEstudiantes.sostenimiento;
           
        }
  
        return res.json({
            success: success,
            codigorefrendacion: codigorefrendacion,
            institucion: institucion,
            titulo: titulo,
            especialidad: especialidad,
            fechaGrado: fechaGrado,
            provinciaInstitucion: provinciaInstitucion,
            cantonInstitucion: cantonInstitucion,
            parroquiaInstitucion: parroquiaInstitucion,
            amieInstitucion: amieInstitucion,
            sostenimiento: sostenimiento

        });
    } catch (err) {
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});
/* consumo servicio antiguo */

router.patch('/actualizacionESPOCHMINEDU2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    let reportebase64 = '';
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];
    try {
        var personapersonalizado = await new Promise((resolve, reject) => {
            actualizarV2.obtenerPersonaPersonalizado(cedula, (err, valor) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(valor);
                }
            });
        }).catch(err => {
            console.error("Error al obtener la información por medio de la cedula :", err);
        });
        console.log(personapersonalizado)
        if (personapersonalizado.length > 0) {
            for (const persona of personapersonalizado) {
                const cedula = persona.pid_valor;
                console.log(cedula)
                let success = false;
                try {
                    const datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC2(cedula, (valor) => { resolve(valor); }) });
                    const datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes2(cedula, (valor) => { resolve(valor); }) });
                    const registroministerio = await new Promise(resolve => { serviciodinardapminEducacion2(cedula, (err, valor) => { resolve(valor); }) });
                   
                    console.log(registroministerio)
                    if(persona.ifo_registro === registroministerio.codigorefrendacion){
                        const  codigorefrendacion = persona.inf_registro;
                        const actualizacionCiudad = datosespochmineduEstudiantes.cantonInstitucion;
                        console.log(actualizacionCiudad)
                        try {
                            const query =`
                            UPDATE central.institucion s  
                            SET ciu_id = (
                            SELECT c.ciu_id
                            FROM   central.ciudad c
                            WHERE c.ciu_nombre = $1
                            )   
                            FROM central."instruccionFormal" i
                            WHERE i.ifo_registro = $2;
                            `;
                            const datos = await transaccioncentral.query(query, [actualizacionCiudad, codigorefrendacion ]);

                            if (datos.rowCount > 0) {
                                console.log("Ciudad actualizada correctamente.");
                                resultadosFinales.push({
                                    success: true,
                                    cedula,
                                    actualizacionCiudad
                                });
                            } else {
                                console.log("No se pudo actualizar la Ciudad.");
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                
                } catch (err) {
                    console.log('Error con cedula: ' + cedula + ', Error: ' + err);
                    resultadosFinales.push({
                        success: false,
                        BaseDatos: persona,
                        mensaje: 'Error al procesar los datos para la cédula proporcionada.'
                    });
                }
            }
            return res.json({
                success: true,
                listado: resultadosFinales
            });
        } else {
            return res.json({
                success: false,
                listado: []
            });
        }
        } catch (err) {
        console.error('Error: ', err);
        return res.json({
            success: false,
            mensaje: 'Error al procesar la solicitud.'
        });
    } finally {
        await transaccioncentral.release();
    }
});  
/* MINEDU */
router.get('/cosnumodinardapESPOCHMINEDUC2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatos = [];
    var success = false;
    try {
        var datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC2(cedula, (valor) => { resolve(valor); }) });
        if (datosespochminedu != null) {
            espochMineduDatos = datosespochminedu;
            success = true;
        }
        return res.json({
            success: success,
            listado: espochMineduDatos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function consumodinardapESPOCHMINEDUC2(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoESPOCH_MINEDUC;
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
                        let listacamposEspochMineduc = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposEspochMineduc) {
                            listado.push(campos);
                        }
                        var institucion = ''
                        var titulo = ''
                        var especialidad = ''
                        var fechaGrado =''

                        for (atr of listado) {
                            if (atr.campo == "institucion") {
                                institucion = atr.valor;
                            }
                            if (atr.campo == "titulo") {
                                titulo = atr.valor;
                            }
                            if (atr.campo == "especialidad") {
                                especialidad = atr.valor;
                            }
                            if (atr.campo == "fechaGrado") {
                                fechaGrado = atr.valor;
                            }                               
                        }
                        
                        var espochMineduDatos = {
                            institucion: institucion,
                            titulo: titulo,
                            especialidad: especialidad,
                            fechaGrado: fechaGrado

                        }
                        callback(espochMineduDatos)
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
/* servicio 895 */
async function consumodinardapESPOCH_Senescyt895(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaqSenescyt;
        const args = {
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
                        console.log('Error: ' + err);
                        callback(null);
                    } else {
                        var jsonString = JSON.stringify(result.paquete);
                        var objjson = JSON.parse(jsonString);
                        let listacampossenecyt = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacampossenecyt) {
                            listado.push(campos);
                        }
                        var fechaGrado = '';
                        var fechaRegistro = '';
                        var ies = '';
                        var nivel = '';
                        var nombreTitulo = '';
                        var numeroIdentificacion = '';
                        var numeroRegistro = '';
                        var tipoExtranjeroColegio = '';
                        var tipoTitulo = '';
                        for (atr of listado) {
                            if (atr.campo == "fechaGrado") {
                                fechaGrado = atr.valor;
                            }
                            if (atr.campo == "fechaRegistro") {
                                fechaRegistro = atr.valor;
                            }
                            if (atr.campo == "ies") {
                                ies = atr.valor;
                            }
                            if (atr.campo == "nivel") {
                                nivel = atr.valor;
                            }
                            if (atr.campo == "nombreTitulo") {
                                nombreTitulo = atr.valor;
                            }
                            if (atr.campo == "numeroIdentificacion") {
                                numeroIdentificacion = atr.valor;
                            }
                            if (atr.campo == "numeroRegistro") {
                                numeroRegistro = atr.valor;
                            }
                            if (atr.campo == "tipoExtranjeroColegio") {
                                tipoExtranjeroColegio = atr.valor;
                            }
                            if (atr.campo == "tipoTitulo") {
                                tipoTitulo = atr.valor;
                            }

                        }
                        var datosSenecyt = {
                            Fecha_De_Grado: fechaGrado,
                            Fecha_Registro: fechaRegistro,
                            IES: ies,
                            Nivel: nivel,
                            Nombre_Titulo: nombreTitulo, 
                            Numero_Identificacion: numeroIdentificacion,
                            NumeroRegistro: numeroRegistro,
                            TipoExtranjeroColegio: tipoExtranjeroColegio,
                            TipoTitulo: tipoTitulo
                        };
                        callback(datosSenecyt); 
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo de los datos Demográficos: ' + err);
            }
        });
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack);
        return callback(null);
    }
}
router.get('/cosnumodinardapDatosSenecyt2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosSenecyt= [];
    var success = false;
    try {
        var datossenecyt = await new Promise(resolve => { consumodinardapESPOCH_Senescyt895(cedula, (valor) => { resolve(valor); }) });
        if (datossenecyt != null) {
            datosSenecyt = datossenecyt
            success = true;
        }
        return res.json({
            success: success,
            listado: datosSenecyt
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
/*   DATOS CNE*/
router.get('/cosnumodinardapDatosCNE2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosCne= [];
    var success = false;
    try {
        var datoscne = await new Promise(resolve => { consumodinardapESPOCH_CNE2(cedula, (valor) => { resolve(valor); }) });
        if (datoscne != null) {
            datosCne = datoscne
            success = true;
        }
        return res.json({
            success: success,
            listado: datosCne
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
async function consumodinardapESPOCH_CNE2(cedula, callback) {
    try {
        let listado = [];
        let listadevuelta = [];
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.ESPOCH_CNE;
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
                        console.log('Error: ' + err);
                        callback(null);
                    } else {
                        var jsonString = JSON.stringify(result.paquete);
                        var objjson = JSON.parse(jsonString);
                        let listacamposcne = objjson.entidades.entidad[0].filas.fila[0].columnas.columna;
                        for (campos of listacamposcne) {
                            listado.push(campos);
                        }
                        var multa= '';
                        for (atr of listado) {
                            if (atr.campo == "multa") {
                                multa = atr.valor;
                            }                

                        }
                        var datosCne = {
                           multa: multa,
                        };
                        callback(datosCne); 
                    }
                });
            } else {
                callback(null);
                console.log('Error consumo : ' + err)
            }

        }
        );
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
module.exports = router;