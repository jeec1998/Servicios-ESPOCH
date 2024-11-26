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

module.exports = router;