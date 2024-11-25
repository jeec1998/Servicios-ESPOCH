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
router.get('/ObtenerBiometria/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadoFinal = {};

    try {
        // Obtener imagen de la base de datos
        let personaImagen = await transaccioncentral.query(
            `SELECT imagen FROM central.personaimagen p
             JOIN central."documentoPersonal" u ON p.per_id = u.per_id
             WHERE u.pid_valor = $1`, [cedula]
        );

        // Verificar si ya existe una imagen
        if (personaImagen.rows.length > 0 && personaImagen.rows[0].imagen) {
            resultadoFinal = {
                success: true,
                imagen: personaImagen.rows[0].imagen
            };
        } else {
            // Llamar al servicio para obtener la imagen si no existe en la base de datos
            const reportebase64 = await new Promise(resolve => {
                consumodinardapESPOCH_DIGERIC_Biometrico(cedula, valor => resolve(valor));
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
/* consulta de informacion por medio del Nombre y Apellidos */
/* Cedula */
router.get('/ObtenerDatosPersonaCedula/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();

    try {
        const consulta = `
            SELECT p.per_id, p.per_nombres, p."per_primerApellido", p."per_segundoApellido", p.per_email, 
                p."per_emailAlternativo", p."per_telefonoCelular", p."per_fechaNacimiento", p.etn_id, et.etn_nombre, 
                p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p."per_telefonoCasa", p.lugarprocedencia_id, 
                prr.prq_nombre, dir."dir_callePrincipal", dir.prq_id as idprqdireccion, 
                (SELECT prq_nombre FROM central.parroquia WHERE prq_id=dir.prq_id) as parroquiadireccion, 
                nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia
            FROM central.persona p 
            INNER JOIN central."documentoPersonal" d ON p.per_id=d.per_id 
            INNER JOIN central.etnia et ON p.etn_id=et.etn_id 
            LEFT JOIN central.direccion dir ON p.per_id=dir.per_id 
            LEFT JOIN central.parroquia prr ON p.lugarprocedencia_id=prr.prq_id 
            LEFT JOIN central."nacionalidadPersona" np ON p.per_id=np.per_id 
            LEFT JOIN central.nacionalidad nac ON np.nac_id=nac.nac_id 
            INNER JOIN central.genero gn ON p.gen_id=gn.gen_id 
            INNER JOIN central."estadoCivil" estc ON p.eci_id=estc.eci_id 
            LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id 
            WHERE d.pid_valor = $1
        `;
        const resultado = await transaccioncentral.query(consulta, [cedula]);

        if (resultado.rows.length > 0) {
            res.json({
                success: true,
                data: resultado.rows
            });
        } else {
            res.json({
                success: false,
                mensaje: "No se encontraron datos para la cédula proporcionada."
            });
        }
    } catch (err) {
        console.error("Error al obtener los datos:", err);
        res.json({
            success: false,
            mensaje: "Error al procesar la solicitud."
        });
    } finally {
        await transaccioncentral.release();
    }
});

/* Nombre */
router.get('/ObtenerDatosPersona/:nombre', async (req, res) => {
    const nombre = req.params.nombre;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();

    try {
        const consulta = `
            SELECT p.per_id, p.per_nombres, p."per_primerApellido", p."per_segundoApellido", p.per_email, 
                p."per_emailAlternativo", p."per_telefonoCelular", p."per_fechaNacimiento", p.etn_id, et.etn_nombre, 
                p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p."per_telefonoCasa", p.lugarprocedencia_id, 
                prr.prq_nombre, dir."dir_callePrincipal", dir.prq_id as idprqdireccion, 
                (SELECT prq_nombre FROM central.parroquia WHERE prq_id=dir.prq_id) as parroquiadireccion, 
                nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia
            FROM central.persona p 
            INNER JOIN central."documentoPersonal" d ON p.per_id=d.per_id 
            INNER JOIN central.etnia et ON p.etn_id=et.etn_id 
            LEFT JOIN central.direccion dir ON p.per_id=dir.per_id 
            LEFT JOIN central.parroquia prr ON p.lugarprocedencia_id=prr.prq_id 
            LEFT JOIN central."nacionalidadPersona" np ON p.per_id=np.per_id 
            LEFT JOIN central.nacionalidad nac ON np.nac_id=nac.nac_id 
            INNER JOIN central.genero gn ON p.gen_id=gn.gen_id 
            INNER JOIN central."estadoCivil" estc ON p.eci_id=estc.eci_id 
            LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id 
            WHERE p.per_nombres ILIKE '%' || $1 || '%'
        `;
        const resultado = await transaccioncentral.query(consulta, [nombre]);

        if (resultado.rows.length > 0) {
            
            res.json({
                success: true,
                data: resultado.rows
            });
        } else {
           
        
            res.json({
                success: false,
                mensaje: "No se encontraron datos para el nombre proporcionado."
            });
        }
    } catch (err) {
        console.error("Error al obtener los datos:", err);
        res.json({
            success: false,
            mensaje: "Error al procesar la solicitud."
        });
    } finally {
        await transaccioncentral.release();
    }
});
/* primer Apellido */
router.get('/ObtenerDatosPersonaApellido/:apellido', async (req, res) => {
    const apellido = req.params.apellido;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();

    try {
        
        let consulta = `
            SELECT p.per_id, p.per_nombres, p."per_primerApellido", p."per_segundoApellido", p.per_email, 
                p."per_emailAlternativo", p."per_telefonoCelular", p."per_fechaNacimiento", p.etn_id, et.etn_nombre, 
                p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p."per_telefonoCasa", p.lugarprocedencia_id, 
                prr.prq_nombre, dir."dir_callePrincipal", dir.prq_id as idprqdireccion, 
                (SELECT prq_nombre FROM central.parroquia WHERE prq_id=dir.prq_id) as parroquiadireccion, 
                nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia
            FROM central.persona p 
            INNER JOIN central."documentoPersonal" d ON p.per_id=d.per_id 
            INNER JOIN central.etnia et ON p.etn_id=et.etn_id 
            LEFT JOIN central.direccion dir ON p.per_id=dir.per_id 
            LEFT JOIN central.parroquia prr ON p.lugarprocedencia_id=prr.prq_id 
            LEFT JOIN central."nacionalidadPersona" np ON p.per_id=np.per_id 
            LEFT JOIN central.nacionalidad nac ON np.nac_id=nac.nac_id 
            INNER JOIN central.genero gn ON p.gen_id=gn.gen_id 
            INNER JOIN central."estadoCivil" estc ON p.eci_id=estc.eci_id 
            LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id 
            WHERE p."per_primerApellido" ILIKE '%' || $1 || '%' OR p."per_segundoApellido" ILIKE '%' || $1 || '%'
        `;
        
        
        let resultado = await transaccioncentral.query(consulta, [apellido]);

        if (resultado.rows.length > 0) {
           
            return res.json({
                success: true,
                data: resultado.rows
            });
        } 
    } catch (err) {
        console.error("Error al obtener los datos:", err);
        res.json({
            success: false,
            mensaje: "Error al procesar la solicitud."
        });
    } finally {
        await transaccioncentral.release();
    }
});
/* Apellidos completos */
router.get('/ObtenerDatosPersonaCompleto/:completo', async (req, res) => {
    const completo = req.params.apellido;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();

    try {
        
        let consulta = `
           SELECT p.per_id, p.per_nombres, p."per_primerApellido", p."per_segundoApellido", p.per_email, 
                p."per_emailAlternativo", p."per_telefonoCelular", p."per_fechaNacimiento", p.etn_id, et.etn_nombre, 
                p.eci_id, estc.eci_nombre, p.gen_id, gn.gen_nombre, p."per_telefonoCasa", p.lugarprocedencia_id, 
                prr.prq_nombre, dir."dir_callePrincipal", dir.prq_id as idprqdireccion, 
                (SELECT prq_nombre FROM central.parroquia WHERE prq_id=dir.prq_id) as parroquiadireccion, 
                nac.nac_id, nac.nac_nombre, p.sex_id, sex_nombre as sexo, p.per_procedencia
            FROM central.persona p 
            INNER JOIN central."documentoPersonal" d ON p.per_id=d.per_id 
            INNER JOIN central.etnia et ON p.etn_id=et.etn_id 
            LEFT JOIN central.direccion dir ON p.per_id=dir.per_id 
            LEFT JOIN central.parroquia prr ON p.lugarprocedencia_id=prr.prq_id 
            LEFT JOIN central."nacionalidadPersona" np ON p.per_id=np.per_id 
            LEFT JOIN central.nacionalidad nac ON np.nac_id=nac.nac_id 
            INNER JOIN central.genero gn ON p.gen_id=gn.gen_id 
            INNER JOIN central."estadoCivil" estc ON p.eci_id=estc.eci_id 
            LEFT JOIN central.sexo ON sexo.sex_id = p.sex_id 
            WHERE p.per_nombres ILIKE '%' || $1 || '%' OR  p."per_primerApellido" ILIKE '%' || $1 || '%' OR p."per_segundoApellido" ILIKE '%' || $1 || '%'
        `;
        
        
        let resultado = await transaccioncentral.query(consulta, [completo]);

        if (resultado.rows.length > 0) {
           
            return res.json({
                success: true,
                data: resultado.rows
            });
        } 
    } catch (err) {
        console.error("Error al obtener los datos:", err);
        res.json({
            success: false,
            mensaje: "Error al procesar la solicitud."
        });
    } finally {
        await transaccioncentral.release();
    }
});



/* Actualizar por medio de la cedula */
router.patch('/actualizacionDiscapacidad/:cedula', async (req, res) => {
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
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
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
router.patch('/actualizacionDiscapacidadPorcentaje', async (req, res) => {
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
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
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
router.patch('/actualizacionDiscapacidadTodo', async (req, res) => {
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
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
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
router.get('/discapacidadadDBlimitada', async (req, res) => {
    try {
        var personadiscapacitada = await new Promise(resolve => {
            actualizarV2.obtenerdiscapacidad((err, valor) => resolve(valor));
        });
        if (personadiscapacitada.length > 0) {
            let resultadosFinales = [];
            const personasLimitadas = personadiscapacitada.slice(0, 10);

            for (const persona of personasLimitadas) {
                const cedula = persona.pid_valor;
                let success = false;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
                    });

                    if (espochMSP.mensaje != null) {
                        resultadosFinales.push({
                            success: false,
                            BaseDatos: persona, 
                            mensaje: espochMSP.mensaje
                        });
                        continue; 
                    }

                    if (espochMSP.codigoConadis) {
                        success = true;
                        resultadosFinales.push({
                            success: success,
                            BaseDatos: persona, 
                            ESPOCHMSP: espochMSP
                        });
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
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});
/*  */
/*Get *********************************************************************/

router.get('/discapacidadadDB', async (req, res) => {
    try {

        var personadiscapacitada = await new Promise(resolve => {
            actualizarV2.obtenerdiscapacidad((err, valor) => resolve(valor));
        });

        if (personadiscapacitada.length > 0) {
            let resultadosFinales = [];
            for (const persona of personadiscapacitada) {
                const cedula = persona.pid_valor;
                let success = false;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
                    });

                    if (espochMSP.mensaje != null) {
                        resultadosFinales.push({
                            success: false,
                            BaseDatos: persona, 
                            mensaje: espochMSP.mensaje
                        });
                        continue; 
                    }

                    if (espochMSP.codigoConadis) {
                        success = true;
                        resultadosFinales.push({
                            success: success,
                            BaseDatos: persona, 
                            ESPOCHMSP: espochMSP
                        });
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
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});
router.post('/discapacidadandDBActualizar', async (req, res) => {
    try {

        var personadiscapacitada = await new Promise(resolve => {
            actualizarV2.obtenerdiscapacidad((err, valor) => resolve(valor));
        });

        if (personadiscapacitada.length > 0) {
           for (const persona of personadiscapacitada) {
                const cedula = persona.pid_valor;
                let success = false;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP(cedula, valor => resolve(valor));
                    });
                    if (persona.dis_valor === 0) {
                        success = true;
                        const carnet = persona.cdi_numero;
                        const nuevoPorcentajeDiscapacidad = espochMSP.porcentajeDiscapacidad;
                    
                        try {
                            const result = await new Promise((resolve, reject) => {
                                actualizarV2.actualizarPorcentajeDiscapacidad(carnet, nuevoPorcentajeDiscapacidad, (err, result) => {
                                    if (err) {
                                        console.error("Error al actualizar el porcentaje de discapacidad:", err);
                                        return reject(err);
                                    }
                                    resolve(result); 
                                });
                            });
                            if (result) {
                                console.log("Porcentaje de discapacidad actualizado correctamente.");
                                return res.json({
                                    success: true,
                                });
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
        console.log('Error: ' + err);
        return res.json({
            success: false
        });
    }
});
/* ***************************************************************************************** */

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
async function consumodinardapESPOCHMINEDUC(cedula, callback) {
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
async function consumodinardapESPOCHMINEDUCEstudiantes(cedula, callback) {
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
/* servicio 895 */
async function consumodinardapESPOCH_Senescyt(cedula, callback) {
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

/* servicio 899 */
async function serviciodinardapminEducacion899(cedulapersona, callback) {
    let listado = [];
    try {
        let registroministerio = {};
        var cedula = "";
        var nombre = "";
        var institucion = "";
        var titulo = "";
        var especialidad = "";
        var numeroRefrendacion = 1;
        var codigorefrendacion = 1;
        var fechagrado = 1;
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
                            if (registro.campo == 'numeroRefrendacion')
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
async function serviciodinardapminEducacion(cedulapersona, callback) {
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
async function consumodinardapESPOCH_DIGERIC_DEMOGRAFICO(cedula, callback) {
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

async function consumodinardapESPOCH_MDT_Impedimentos(cedula, callback) {
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
async function consumodinardapESPOCH_DIGERIC_Biometrico(cedula, callback) {
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
async function consumodinardapESPOCH_CNE(cedula, callback) {
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

/* MINEDU */
router.get('/cosnumodinardapESPOCHMINEDUC/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatos = [];
    var success = false;
    try {
        var datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC(cedula, (valor) => { resolve(valor); }) });
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
/* DATOS DEMOGRAFICOS */
router.get('/cosnumodinardapDatosDomiciliarios/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosDemograficos = [];
    var success = false;
    try {
        var datosdomiciliarios = await new Promise(resolve => { consumodinardapESPOCH_DIGERIC_DEMOGRAFICO(cedula, (valor) => { resolve(valor); }) });
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
/* DATOS BIOMETRICOS */
router.get('/cosnumodinardapDatosBiometricos/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosBiometricos = [];
    var success = false;
    try {
        var datosbiometricos = await new Promise(resolve => { consumodinardapESPOCH_DIGERIC_Biometrico(cedula, (valor) => { resolve(valor); }) });
        if (datosbiometricos != null) {
            datosBiometricos = datosbiometricos
            success = true;
        }
        return res.json({
            success: success,
            listado: datosBiometricos
        });
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});
/*   DATOS CNE*/
router.get('/cosnumodinardapDatosCNE/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosCne= [];
    var success = false;
    try {
        var datoscne = await new Promise(resolve => { consumodinardapESPOCH_CNE(cedula, (valor) => { resolve(valor); }) });
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
/* Datos MDT no vale aun */
router.get('/cosnumodinardapDatosMDT/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var datosMDT = [];
    var success = false;
    try {
        var datosmdt = await new Promise(resolve => { consumodinardapESPOCH_MDT_Impedimentos(cedula, (valor) => { resolve(valor); }) });
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
router.get('/cosnumodinardapminEducaion/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatos = [];
    var success = false;
    try {
        var datosespoch = await new Promise(resolve => { serviciodinardapminEducacion(cedula, (err, valor) => { resolve(valor); }) });
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
router.get('/cosnumodinardapESPOCHMINEDUCEstudiantes/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    var espochMineduDatosEstudiante = [];
    var success = false;
    try {
        var datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes(cedula, (valor) => { resolve(valor); }) });
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
router.get('/consumodinardapESPOCHMINEDUCCompleto/:cedula', async (req, res) => {
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
        var datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC(cedula, (valor) => { resolve(valor); }) });
        var datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes(cedula, (valor) => { resolve(valor); }) });
        var registroministerio = await new Promise(resolve => { serviciodinardapminEducacion(cedula, (err, valor) => { resolve(valor); }) });
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

 router.post('/actualizacionESPOCHMINEDU/:cedula', async (req, res) => {
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
                    const datosespochminedu = await new Promise(resolve => { consumodinardapESPOCHMINEDUC(cedula, (valor) => { resolve(valor); }) });
                    const datosespochmineduEstudiantes = await new Promise(resolve => { consumodinardapESPOCHMINEDUCEstudiantes(cedula, (valor) => { resolve(valor); }) });
                    const registroministerio = await new Promise(resolve => { serviciodinardapminEducacion(cedula, (err, valor) => { resolve(valor); }) });
                   
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
module.exports = router;