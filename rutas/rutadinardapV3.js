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

/* consulta de informacion por medio del Nombre y Apellidos */
/*  completos */
router.get('/ObtenerDatosPersonaCompleto2/:completo', async (req, res) => {
    const completo = req.params.completo
        .trim()
        .replace(/\s+/g, ' '); // Reemplaza múltiples espacios por un único espacio
    
    const palabras = completo.split(' '); // Divide la entrada en palabras clave

    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();

    try {
        // Construye dinámicamente las condiciones ILIKE
        const condiciones = palabras
            .map((_, i) => `(p.per_nombres || ' ' || p."per_primerApellido" || ' ' || p."per_segundoApellido" ILIKE $${i + 1})`)
            .join(' AND ');

        const consulta = `
            SELECT 
                p.per_id, 
                p.per_nombres, 
                p."per_primerApellido",
                p."per_segundoApellido", 
                p.per_email, 
                p."per_emailAlternativo", 
                p."per_telefonoCelular", 
                p."per_fechaNacimiento", 
                p.etn_id, 
                et.etn_nombre, 
                p.eci_id, 
                estc.eci_nombre, 
                p.gen_id, 
                gn.gen_nombre, 
                p."per_telefonoCasa", 
                p.lugarprocedencia_id, 
                prr.prq_nombre, 
                dir."dir_callePrincipal", 
                dir.prq_id as idprqdireccion, 
                (SELECT prq_nombre FROM central.parroquia WHERE prq_id=dir.prq_id) as parroquiadireccion, 
                nac.nac_id, 
                nac.nac_nombre, 
                p.sex_id, 
                sex_nombre as sexo, 
                p.per_procedencia
            FROM 
                central.persona p 
            INNER JOIN 
                central."documentoPersonal" d ON p.per_id=d.per_id 
            INNER JOIN 
                central.etnia et ON p.etn_id=et.etn_id 
            LEFT JOIN 
                central.direccion dir ON p.per_id=dir.per_id 
            LEFT JOIN 
                central.parroquia prr ON p.lugarprocedencia_id=prr.prq_id 
            LEFT JOIN 
                central."nacionalidadPersona" np ON p.per_id=np.per_id 
            LEFT JOIN 
                central.nacionalidad nac ON np.nac_id=nac.nac_id 
            INNER JOIN 
                central.genero gn ON p.gen_id=gn.gen_id 
            INNER JOIN 
                central."estadoCivil" estc ON p.eci_id=estc.eci_id 
            LEFT JOIN 
                central.sexo sexo ON sexo.sex_id = p.sex_id 
            WHERE ${condiciones};
        `;

        // Crea el array de parámetros para la consulta
        const parametros = palabras.map(palabra => `%${palabra}%`);

        const resultado = await transaccioncentral.query(consulta, parametros);

        if (resultado.rows.length > 0) {
            return res.json({
                success: true,
                data: resultado.rows
            });
        } else {
            return res.json({
                success: false,
                mensaje: "No se encontraron resultados."
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



/* Obtener Biometria (Imagen) */
router.get('/ObtenerBiometria2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadoFinal = {};

    try {
        // Verificar si existe imagen asociada a la cédula
        let personaImagen = await transaccioncentral.query(
            `SELECT p.imagen, p.per_id 
             FROM central.personaimagen p
             JOIN central."documentoPersonal" u ON p.per_id = u.per_id
             WHERE u.pid_valor = $1`, [cedula]
        );

        // Si existe imagen, retornarla
        if (personaImagen.rows.length > 0 && personaImagen.rows[0].imagen) {
            resultadoFinal = {
                success: true,
                imagen: personaImagen.rows[0].imagen
            };
        } else {
            // Obtener la nueva imagen desde el servicio externo
            const reportebase64 = await new Promise(resolve => {
                consumodinardapESPOCH_DIGERIC_Biometrico1(cedula, valor => resolve(valor));
            });

            if (reportebase64) {
                try {
                    if (personaImagen.rows.length > 0) {
                        // Actualizar si ya existe registro para la persona
                        const query = `
                            UPDATE central.personaimagen 
                            SET imagen = $1
                            WHERE per_id = $2
                        `;
                        const datosImagen = await transaccioncentral.query(query, [reportebase64, personaImagen.rows[0].per_id]);

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
                    } else {
                        // Insertar si no existe registro para la persona
                        const perIdQuery = `
                            SELECT per_id 
                            FROM central."documentoPersonal" 
                            WHERE pid_valor = $1
                        `;
                        const perIdResult = await transaccioncentral.query(perIdQuery, [cedula]);

                        if (perIdResult.rows.length > 0) {
                            const perId = perIdResult.rows[0].per_id;

                            const insertQuery = `
                                INSERT INTO central.personaimagen (per_id, imagen) 
                                VALUES ($1, $2)
                            `;
                            const datosInsertados = await transaccioncentral.query(insertQuery, [perId, reportebase64]);

                            if (datosInsertados.rowCount > 0) {
                                resultadoFinal = {
                                    success: true,
                                    imagen: reportebase64
                                };
                                console.log("Imagen insertada correctamente.");
                            } else {
                                resultadoFinal = {
                                    success: false,
                                    mensaje: "No se pudo insertar la imagen en la base de datos."
                                };
                            }
                        } else {
                            resultadoFinal = {
                                success: false,
                                mensaje: "No se encontró el per_id asociado a la cédula."
                            };
                        }
                    }
                } catch (error) {
                    console.error("Error durante la actualización o inserción de la imagen:", error);
                    resultadoFinal = {
                        success: false,
                        mensaje: "Error al actualizar o insertar la imagen en la base de datos."
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
/* Actualizar la discapacidad por medio de la cedula  */
router.patch('/actualizacionDiscapacidad2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];
    let resumen = { actualizados: 0, sinCambios: 0, fallidos: 0 };

    try {
        const query = `
            SELECT 
                u."per_id", 
                u."pid_valor", 
                c."cdi_numero", 
                c."org_id", 
                o."org_nombre", 
                c."cdi_habilitado", 
                d."dis_valor", 
                t."tdi_nombre", 
                d."dis_grado"
            FROM central."documentoPersonal" u
            JOIN central."carnetDiscapacidad" c ON u.per_id = c.per_id 
            JOIN central."discapacidad" d ON c.cdi_id = d.cdi_id 
            JOIN central."organizacion" o ON c.org_id = o.org_id 
            JOIN central."tipoDiscapacidad" t ON d.tdi_id = t.tdi_id 
            JOIN central."medidaDiscapacidad" m ON d.mdi_id = m.mdi_id
            WHERE u.tdi_id = 1 AND u.pid_valor = $1
        `;
        const personadiscapacitada = await transaccioncentral.query(query, [cedula]);

        if (personadiscapacitada.rows.length > 0) {
            for (const persona of personadiscapacitada.rows) {
                const { pid_valor, dis_valor, dis_grado, tdi_nombre, cdi_numero, per_id } = persona;
                let reportePersona = { cedula: pid_valor, cambios: [], estado: 'sinCambios' };

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP2(pid_valor, valor => resolve(valor));
                    });

                    if (dis_valor !== espochMSP.porcentajeDiscapacidad) {
                        const query = `
                            UPDATE central.discapacidad d 
                            SET dis_valor = $1 
                            FROM central."carnetDiscapacidad" c 
                            WHERE d.cdi_id = c.cdi_id AND c.cdi_numero = $2
                        `;
                        const result = await transaccioncentral.query(query, [espochMSP.porcentajeDiscapacidad, cdi_numero]);
                        if (result.rowCount > 0) {
                            reportePersona.cambios.push('porcentajeDiscapacidad');
                            reportePersona.estado = 'actualizado';
                        }
                    }

                    if (dis_grado !== espochMSP.gradoDiscapacidad) {
                        const query = `
                            UPDATE central.discapacidad d 
                            SET dis_grado = $1 
                            FROM central."carnetDiscapacidad" c 
                            WHERE d.cdi_id = c.cdi_id AND c.cdi_numero = $2
                        `;
                        const result = await transaccioncentral.query(query, [espochMSP.gradoDiscapacidad, cdi_numero]);
                        if (result.rowCount > 0) {
                            reportePersona.cambios.push('gradoDiscapacidad');
                            reportePersona.estado = 'actualizado';
                        }
                    }

                    if (tdi_nombre !== espochMSP.tipoDiscapacidadPredomina) {
                        const query = `
                            UPDATE central.discapacidad d 
                            SET tdi_id = (
                                SELECT t.tdi_id FROM central."tipoDiscapacidad" t WHERE t.tdi_nombre = $1
                            )
                            FROM central."carnetDiscapacidad" c
                            WHERE d.cdi_id = c.cdi_id AND c.cdi_numero = $2
                        `;
                        const result = await transaccioncentral.query(query, [espochMSP.tipoDiscapacidadPredomina, cdi_numero]);
                        if (result.rowCount > 0) {
                            reportePersona.cambios.push('tipoDiscapacidad');
                            reportePersona.estado = 'actualizado';
                        }
                    }

                    if (cdi_numero !== espochMSP.codigoConadis) {
                        const query = `
                            UPDATE central."carnetDiscapacidad" 
                            SET cdi_numero = $1 
                            WHERE per_id = $2
                        `;
                        const result = await transaccioncentral.query(query, [espochMSP.codigoConadis, per_id]);
                        if (result.rowCount > 0) {
                            reportePersona.cambios.push('codigoConadis');
                            reportePersona.estado = 'actualizado';
                        }
                    }

                } catch (err) {
                    reportePersona.estado = 'fallido';
                    reportePersona.error = err.message;
                }

                resultadosFinales.push(reportePersona);
            }

            resumen.actualizados = resultadosFinales.filter(r => r.estado === 'actualizado').length;
            resumen.sinCambios = resultadosFinales.filter(r => r.estado === 'sinCambios').length;
            resumen.fallidos = resultadosFinales.filter(r => r.estado === 'fallido').length;

            return res.json({ success: true, resultados: resultadosFinales });
        } else {
            return res.json({ success: false, mensaje: 'No se encontraron personas con discapacidad para la cédula proporcionada.' });
        }
    } catch (err) {
        console.error('Error: ', err);
        return res.json({ success: false, mensaje: 'Error al procesar la solicitud.' });
    } finally {
        await transaccioncentral.release();
    }
});


/* Actualizar toda la base de datos la discapacidad */
router.patch('/actualizacionDiscapacidadTodo2', async (req, res) => {
    const poolcentralizada = new Pool(db);
    const transaccioncentral = await poolcentralizada.connect();
    let resultadosFinales = [];

    try {
        const queryPersonasDiscapacitadas = `
            SELECT u."per_id", u."pid_valor", c."cdi_numero", c."org_id", o."org_nombre", c."cdi_habilitado", 
                   d."dis_valor", t."tdi_nombre", d."dis_grado"
            FROM central."documentoPersonal" u
            JOIN central."carnetDiscapacidad" c ON u.per_id = c.per_id
            JOIN central."discapacidad" d ON c.cdi_id = d.cdi_id
            JOIN central."organizacion" o ON c.org_id = o.org_id
            JOIN central."tipoDiscapacidad" t ON d.tdi_id = t.tdi_id
            JOIN central."medidaDiscapacidad" m ON d.mdi_id = m.mdi_id
            WHERE u.tdi_id = 1
        `;

        const { rows: personadiscapacitada } = await transaccioncentral.query(queryPersonasDiscapacitadas);
console.log(personadiscapacitada)
        if (personadiscapacitada.length > 0) {
            for (const persona of personadiscapacitada) {
                const cedula = persona.pid_valor;

                try {
                    const espochMSP = await new Promise(resolve => {
                        consumoESPOCHMSP2(cedula, valor => resolve(valor));
                    });

                    if (persona.dis_valor !== espochMSP.porcentajeDiscapacidad) {
                        const carnet = persona.cdi_numero;
                        const nuevoPorcentajeDiscapacidad = espochMSP.porcentajeDiscapacidad;

                        try {
                            const query = `
                                UPDATE central.discapacidad d 
                                SET dis_valor = $1 
                                FROM central."carnetDiscapacidad" c 
                                WHERE d.cdi_id = c.cdi_id 
                                AND c.cdi_numero = $2
                            `;
                            const datosdiscapacidad = await transaccioncentral.query(query, [nuevoPorcentajeDiscapacidad, carnet]);

                            if (datosdiscapacidad.rowCount > 0) {
                                resultadosFinales.push({
                                    success: true,
                                    carnet,
                                    nuevoPorcentajeDiscapacidad
                                });
                            }
                        } catch (error) {
                            console.error("Error durante la actualización:", error);
                        }
                    }
                } catch (err) {
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
        const listado = [];
        const url = UrlAcademico.urlwsdl2;
        const Username = urlAcademico.usuariodinardap;
        const Password = urlAcademico.clavedinardap;
        const codigopaquete = urlAcademico.codigoESPOCHMSP;

        const args = {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "cedula", valor: cedula }
                ]
            }
        };

        soap.createClient(url, function (err, client) {
            if (err) {
                console.error("Error al crear el cliente SOAP:", err);
                return callback(null);
            }

            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));

            client.consultar(args, function (err, result) {
                if (err) {
                    console.error("Error al consultar el servicio SOAP:", err);
                    return callback(null);
                }

                try {
                    if (!result || !result.paquete) {
                        console.error("Estructura de respuesta inesperada. Resultado:", result);
                        return callback(null);
                    }

                    const paquete = result.paquete;
                    const entidad = paquete.entidades?.entidad?.[0];
                    const fila = entidad?.filas?.fila?.[0];
                    const columnas = fila?.columnas?.columna || [];

                    columnas.forEach(campo => listado.push(campo));

                    const espochMSP = {
                        codigoConadis: listado.find(atr => atr.campo === "codigoConadis")?.valor || "",
                        tipoDiscapacidadPredomina: listado.find(atr => atr.campo === "tipoDiscapacidadPredomina")?.valor || "",
                        gradoDiscapacidad: listado.find(atr => atr.campo === "gradoDiscapacidad")?.valor || "",
                        porcentajeDiscapacidad: listado.find(atr => atr.campo === "porcentajeDiscapacidad")?.valor || ""
                    };

                    callback(espochMSP);
                } catch (parseError) {
                    console.error("Error al procesar la respuesta del servicio SOAP:", parseError);
                    callback(null);
                }
            });
        });
        
    } catch (err) {
        console.error("Error general en consumoESPOCHMSP2:", err.stack);
        callback(null);
    }
}
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
async function consumodinardapSRIGeneral2(cedula, callback) {
    var url = UrlAcademico.urlwsdl;
    var Username = urlAcademico.usuariodinardap;
    var Password = urlAcademico.clavedinardap;
    var codigopaquete = urlAcademico.codigoSRIGeneral;
    var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };

    soap.createClient(url, async function (err, client) {
        if (err) {
            console.log('Error creando cliente SOAP: ' + err);
            callback(null);
            return;
        }
        client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
        client.getFichaGeneral(args, async function (err, result) {
            if (err || !result || !result.return) {
                console.log('Error en el consumo del servicio o respuesta inválida: ' + err);
                callback(null);
                return;
            }

            try {
                var listado = [];
                var jsonString = JSON.stringify(result.return);
                var objjson = JSON.parse(jsonString);
                let listacamposdinardapsrigeneral = objjson?.instituciones?.[0]?.datosPrincipales?.registros || [];

                for (const campos of listacamposdinardapsrigeneral) {
                    listado.push(campos);
                }

                var sriGeneral = {
                    numeroRuc: listado.find(atr => atr.campo === "numeroRuc")?.valor || '',
                    personaSociedad: listado.find(atr => atr.campo === "personaSociedad")?.valor || '',
                    razonSocial: listado.find(atr => atr.campo === "razonSocial")?.valor || '',
                    nombreFantasiaComercial: listado.find(atr => atr.campo === "nombreFantasiaComercial")?.valor || '',
                    actividadEconomicaPrincipal: listado.find(atr => atr.campo === "actividadEconomicaPrincipal")?.valor || ''
                };

                callback(sriGeneral);
            } catch (parseError) {
                console.log('Error procesando la respuesta: ' + parseError);
                callback(null);
            }
        });
    });
}

async function consumodinardapSRICompleto2(cedula, callback) {
    try {
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRICompleto;

        const args = {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula },
                    { nombre: "fuenteDatos", valor: " " }
                ]
            }
        };

        soap.createClient(url, async function (err, client) {
            if (err) {
                console.log('Error creando cliente SOAP: ' + err);
                callback(null);
                return;
            }
            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
            client.consultar(args, async function (err, result) {
                if (err || !result || !result.paquete) {
                    console.log('Error en el consumo del servicio o respuesta inválida: ' + err);
                    callback(null);
                    return;
                }

                try {
                    var listado = [];
                    var jsonString = JSON.stringify(result.paquete);
                    var objjson = JSON.parse(jsonString);
                    let listacampossricompletos = objjson?.entidades?.entidad?.[0]?.filas?.fila?.[0]?.columnas?.columna || [];

                    for (const campos of listacampossricompletos) {
                        listado.push(campos);
                    }

                    var sriCompleto = {
                        telefonoDomicilio: listado.find(atr => atr.campo === "telefonoDomicilio")?.valor || '',
                        direccionLarga: listado.find(atr => atr.campo === "direccionLarga")?.valor || ''
                    };

                    callback(sriCompleto);
                } catch (parseError) {
                    console.log('Error procesando la respuesta: ' + parseError);
                    callback(null);
                }
            });
        });
    } catch (generalError) {
        console.error('Fallo en la consulta: ' + generalError.stack);
        callback(null);
    }
}
async function consumodinardapSRIContactos2(cedula, callback) {
    try {
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRIContactos;

        const args = {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula }
                ]
            }
        };

        soap.createClient(url, async function (err, client) {
            if (err) {
                console.log('Error creando cliente SOAP: ' + err);
                callback(null);
                return;
            }
            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
            client.consultar(args, async function (err, result) {
                if (err || !result || !result.paquete) {
                    console.log('Error en el consumo del servicio o respuesta inválida: ' + err);
                    callback(null);
                    return;
                }

                try {
                    var listado = [];
                    var jsonString = JSON.stringify(result.paquete);
                    var objjson = JSON.parse(jsonString);

                    let entidad = objjson?.entidades?.entidad?.[6];
                    if (!entidad || !entidad.filas || !entidad.filas.fila) {
                        console.log('La entidad o sus filas están vacías o son nulas');
                        callback(null);
                        return;
                    }

                    let listacampossricontactos = entidad.filas.fila[0]?.columnas?.columna || [];
                    for (const campos of listacampossricontactos) {
                        listado.push(campos);
                    }

                    var sriContactos = {
                        telefonoDomicilioR: listado.find(atr => atr.campo === "telefonoDomicilioMedCon")?.valor || ''
                    };

                    callback(sriContactos);
                } catch (parseError) {
                    console.log('Error procesando la respuesta: ' + parseError);
                    callback(null);
                }
            });
        });
    } catch (generalError) {
        console.error('Fallo en la consulta: ' + generalError.stack);
        callback(null);
    }
}
async function consumodinardapSRIDatos2(cedula, callback) {
    try {
        var url = UrlAcademico.urlwsdl2;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoSRIDatos;

        const args = {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula }
                ]
            }
        };

        soap.createClient(url, async function (err, client) {
            if (err) {
                console.log('Error creando cliente SOAP: ' + err);
                callback(null);
                return;
            }
            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
            client.consultar(args, async function (err, result) {
                if (err || !result || !result.paquete) {
                    console.log('Error en el consumo del servicio o respuesta inválida: ' + err);
                    callback(null);
                    return;
                }

                try {
                    var listado = [];
                    var jsonString = JSON.stringify(result.paquete);
                    var objjson = JSON.parse(jsonString);
                    let listacampossridatos = objjson?.entidades?.entidad?.[0]?.filas?.fila?.[0]?.columnas?.columna || [];

                    for (const campos of listacampossridatos) {
                        listado.push(campos);
                    }

                    var sriDatos = {
                        idRepresentanteLegal: listado.find(atr => atr.campo === "idRepreLegal")?.valor || ''
                    };

                    callback(sriDatos);
                } catch (parseError) {
                    console.log('Error procesando la respuesta: ' + parseError);
                    callback(null);
                }
            });
        });
    } catch (generalError) {
        console.error('Fallo en la consulta: ' + generalError.stack);
        callback(null);
    }
}
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
    let datosMDT = [];
    let success = false;

    try {
        const datosmdt = await new Promise(resolve => {
            consumodinardapESPOCH_MDT_Impedimentos2(cedula, (valor) => {
                resolve(valor);
            });
        });

        if (datosmdt) {
            datosMDT = datosmdt;
            success = true;
        }

        return res.json({
            success,
            listado: datosMDT
        });
    } catch (err) {
        console.error('Error en el servicio:', err);
        return res.json({
            success: false,
            mensaje: 'Error interno en el servidor'
        });
    }
});
async function consumodinardapESPOCH_MDT_Impedimentos2(cedula, callback) {
    try {
        const listado = [];
        const url = UrlAcademico.urlwsdl2;
        const Username = urlAcademico.usuariodinardap;
        const Password = urlAcademico.clavedinardap;
        const codigopaquete = urlAcademico.ESPOCH_MDT_Impedimentos;

        const args = {
            parametros: {
                parametro: [
                    { nombre: "codigoPaquete", valor: codigopaquete },
                    { nombre: "identificacion", valor: cedula }
                ]
            }
        };

        soap.createClient(url, async (err, client) => {
            if (err) {
                console.error('Error al crear cliente SOAP:', err);
                return callback(null);
            }

            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
            client.consultar(args, async (err, result) => {
                if (err) {
                    console.error('Error en consulta SOAP:', err);
                    return callback(null);
                }

                try {
                    const jsonString = JSON.stringify(result.paquete);
                    const objjson = JSON.parse(jsonString);
                    const listacamposdatosMDT = objjson?.entidades?.entidad?.[1]?.filas?.fila?.[0]?.columnas?.columna;

                    if (!listacamposdatosMDT) {
                        console.error('Estructura de respuesta inválida o vacía');
                        return callback(null);
                    }

                    for (const campos of listacamposdatosMDT) {
                        listado.push(campos);
                    }

                    const datosMDT = {
                        fechaImpedimento: listado.find(atr => atr.campo === "fechaImpedimento")?.valor || '',
                        tipoImpedimento: listado.find(atr => atr.campo === "tipoImpedimento")?.valor || ''
                    };

                    return callback(datosMDT);
                } catch (error) {
                    console.error('Error procesando datos del servicio:', error);
                    return callback(null);
                }
            });
        });
    } catch (err) {
        console.error('Error general en consumoDinardap:', err.stack);
        return callback(null);
    }
}
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
    let success = true;

    // Variables con valores predeterminados
    let provinciaInstitucion = '';
    let cantonInstitucion = '';
    let parroquiaInstitucion = '';
    let amieInstitucion = '';
    let sostenimiento = '';
    let institucion = '';
    let titulo = '';
    let especialidad = '';
    let fechaGrado = '';
    let codigorefrendacion = '';

    try {
        const datosespochminedu = await new Promise(resolve => {
            consumodinardapESPOCHMINEDUC2(cedula, (valor) => {
                resolve(valor || null);
            });
        });

        const datosespochmineduEstudiantes = await new Promise(resolve => {
            consumodinardapESPOCHMINEDUCEstudiantes2(cedula, (valor) => {
                resolve(valor || null);
            });
        });

        const registroministerio = await new Promise(resolve => {
            serviciodinardapminEducacion2(cedula, (err, valor) => {
                resolve(valor || null);
            });
        });

        // Verificar y asignar datos
        if (registroministerio) {
            codigorefrendacion = registroministerio.codigorefrendacion || 'No disponible';
        } else {
            console.log('No se obtuvo información de serviciodinardapminEducacion2');
        }

        if (datosespochminedu) {
            institucion = datosespochminedu.institucion || 'No disponible';
            titulo = datosespochminedu.titulo || 'No disponible';
            especialidad = datosespochminedu.especialidad || 'No disponible';
            fechaGrado = datosespochminedu.fechaGrado || 'No disponible';
        } else {
            console.log('No se obtuvo información de consumodinardapESPOCHMINEDUC2');
        }

        if (datosespochmineduEstudiantes) {
            provinciaInstitucion = datosespochmineduEstudiantes.provinciaInstitucion || 'No disponible';
            cantonInstitucion = datosespochmineduEstudiantes.cantonInstitucion || 'No disponible';
            parroquiaInstitucion = datosespochmineduEstudiantes.parroquiaInstitucion || 'No disponible';
            amieInstitucion = datosespochmineduEstudiantes.amieInstitucion || 'No disponible';
            sostenimiento = datosespochmineduEstudiantes.sostenimiento || 'No disponible';
        } else {
            console.log('No se obtuvo información de consumodinardapESPOCHMINEDUCEstudiantes2');
        }

        return res.json({
            success: true,
            codigorefrendacion,
            institucion,
            titulo,
            especialidad,
            fechaGrado,
            provinciaInstitucion,
            cantonInstitucion,
            parroquiaInstitucion,
            amieInstitucion,
            sostenimiento
        });

    } catch (err) {
        console.error('Error general en la ruta:', err.message);
        return res.json({
            success: false,
            error: 'Error al procesar la solicitud. Consulte los logs para más detalles.'
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
                        console.error('Error al consumir el servicio: ', err);
                        callback(null);
                    } else if (!result?.paquete?.entidades?.entidad?.[0]?.filas?.fila?.[0]?.columnas?.columna) {
                        console.warn('Sin datos del servicio para la cédula proporcionada.');
                        callback(null);
                    } else {
                        let listacampossenecyt = result.paquete.entidades.entidad[0].filas.fila[0].columnas.columna;
                        let datosSenecyt = listacampossenecyt.reduce((datos, atr) => {
                            datos[atr.campo] = atr.valor;
                            return datos;
                        }, {});
                        callback(datosSenecyt);
                    }
                });
            } else {
                console.error('Error al crear el cliente SOAP:', err);
                callback(null);
            }
        });
    } catch (err) {
        console.error('Fallo en la consulta:', err.stack);
        callback(null);
    }
}

router.get('/cosnumodinardapDatosSenecyt2/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        const datosSenecyt = await new Promise(resolve => 
            consumodinardapESPOCH_Senescyt895(cedula, resolve)
        );
        const success = datosSenecyt != null;
        res.json({
            success: success,
            listado: success ? datosSenecyt : [],
        });
    } catch (err) {
        console.error('Error en el endpoint:', err);
        res.status(500).json({
            success: false,
            message: 'Ocurrió un error en el servidor.'
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