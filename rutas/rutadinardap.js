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

router.get('/obtenerpersona/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
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
            let fechaactual = new Date();
            let resta = fechaactual.getTime() - fechasistema.getTime();
            var resultadoresta = Math.round(resta / (1000 * 60 * 60 * 24));
            console.log('Fecha centralizada: ' + fechasistema)
            console.log('Diferencias de dias en las fechas: ' + resultadoresta)
            if ((resultadoresta > numerodias) && (numerodias != 0)) {
                var listadinardap = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
                listado.push(persona);                
            }
            else {
                listado.push(persona);    
                console.log('Persona devuelta de la centralizada')
            }
            return res.json({
                success: true,
                listado: listado
            });
        }
        else {
            /*tipo = 2;
            var listadinardap = await new Promise(resolve => { consumirserviciodinardap(tipo, cedula, res, persona, (err, valor) => { resolve(valor); }) });
            console.log(listadinardap)*/
            console.log('Registrar en la centralizada')
        }
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});

async function actualizarcamposportipo(idtipo, campocentralizada, tablacentralizada, valor, objpersona, callback) {
    try {
        let lst = [];
        switch (idtipo) {
            case 1:  // busca el id de estado civil en la centralizada y actualiza el registro de persona
                var estadocivil = await new Promise(resolve => { centralizada.obtenerestadocivildadonombre(valor, (err, valor) => { resolve(valor); }) });
                if (estadocivil.length > 0) {
                    var idestadocivil = estadocivil[0].eci_id;
                    if (idestadocivil != objpersona.eci_id) {
                        //var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona(tablacentralizada, campocentralizada, idestadocivil, objpersona.per_id, (err, valor) => { resolve(valor); }) });
                        var actualizacion = centralizada.actualizarpersona(tablacentralizada, campocentralizada, idestadocivil, objpersona.per_id, function (Result) { });
                        if (actualizacion) {
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
                const nombres = valor.split(" ");
                if (nombres.length > 0) {
                    var primerApellido = nombres[0];
                    listaparametros.push(primerApellido);
                    var segundoApellido = nombres[1];
                    listaparametros.push(segundoApellido);
                    var nombrescompletos = "";
                    for (var i = 2; i < nombres.length; i++) {
                        nombrescompletos = nombrescompletos + nombres[i] + " ";
                    }
                    listaparametros.push(nombrescompletos);
                    const camposcentralizadalst = campocentralizada.split(",");
                    if (camposcentralizadalst.length > 0) {
                        var cont = 0;
                        for (var i = 0; i < camposcentralizadalst.length; i++) {
                            //var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona(tablacentralizada, camposcentralizadalst[i], listaparametros[i], objpersona.per_id, (err, valor) => { resolve(valor); }) });
                            var actualizacion = centralizada.actualizarpersona(tablacentralizada, camposcentralizadalst[i], listaparametros[i], objpersona.per_id, function (Result) { });
                            //console.log('Resultado actualizacion en la centralizada: '+actualizacion)
                            if (actualizacion) {
                                cont = cont + 1;
                            }
                        }
                        if (cont == camposcentralizadalst.length) {
                            console.log('Nombres y Apellidos actualizados correctamente')
                        }
                    }
                }
                //lst.push(objpersona);
                break;
            case 3:   // gestiona conyuge verificando el estado civil registrado
                if (valor != "") {
                    console.log("conyuge: " + valor)
                }
                else {
                    console.log("No existe información de conyuge")
                }
                //lst.push(objpersona);
                break;
            default:
                //lst.push(objpersona);
                break;
        }
        callback(null, objpersona);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

async function consumirserviciodinardap(tipo, cedula, res, persona, callback) {
    try {
        let listado = [];
        let listadevuelta=[];
        var url = UrlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaq;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
        soap.createClient(url, async function (err, client) {
            if (!err) {
                client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                client.getFichaGeneral(args, async function (err, result) {
                    var jsonString = JSON.stringify(result.return);
                    var objjson = JSON.parse(jsonString);
                    let listacamposdinardap = objjson.instituciones[0].datosPrincipales.registros;
                    for (campos of listacamposdinardap) {
                        listado.push(campos);
                    }
                    if (listado.length > 0) {
                        if (tipo == 1) {
                            ////consume la dinardap y actualiza los campos establecidos en la base
                            let listacamposactualizar = [];
                            var campos = await new Promise(resolve => { centralizada.listacamposactualizar((err, valor) => { resolve(valor); }) });
                            if (campos.length > 0) {
                                for (camposbase of campos) {
                                    listacamposactualizar.push(camposbase);
                                }
                                var datosconyuge = "";
                                var blnconyuge = false;
                                for (campoactualizar of listacamposactualizar) {
                                    for (atr of listado) {
                                        if (campoactualizar.ca_nombredinardap == atr.campo) {
                                            let nombrecampo = atr.campo;
                                            if ((nombrecampo.includes("conyuge")) || (nombrecampo.includes("Conyuge"))) {
                                                datosconyuge = datosconyuge + atr.valor + " ";
                                                blnconyuge = true;
                                            }
                                            else {
                                                var personaactualizada = await new Promise(resolve => { actualizarcamposportipo(campoactualizar.ca_tipo, campoactualizar.ca_nombrecentralizada, campoactualizar.ca_tablacentralizada, atr.valor, persona[0], (err, valor) => { resolve(valor); }) });
                                            };
                                        }
                                    }
                                }
                                if (blnconyuge) {
                                    ////pendiente enviar a modificar conyuge
                                    //console.log('Datos conyuge: ' + datosconyuge)
                                }                                
                            }
                            else {
                                console.log('No existen registros para actualizar')
                            }
                        }
                        else {
                            ////consume la dinardap y crea el objeto en la centralizada
                            for (atr of listado) {

                           /*     let personacentralizada = {
                                    per_nombres:, 
                                    per_primerapellido, 
                                    per_segundoapellido, 
                                    per_email, 
                                    per_emailalternativo, 
                                    per_telefonooficina, 
                                    per_telefonocelular, 
                                    per_fechanacimiento, 
                                    per_afiliacioniess, 
                                    tsa_id, 
                                    etn_id, 
                                    eci_id, 
                                    gen_id, 
                                    per_creadopor, 
                                    per_fechacreacion, 
                                    per_modificadopor, 
                                    per_fechamodificacion, 
                                    per_telefonocasa, 
                                    lugarprocedencia_id, 
                                    sex_id, 
                                    per_procedencia, 
                                    per_conyuge, 
                                    per_idconyuge:	
                                */
                            }
                        }
                    }
                    else {
                        console.log('Lista dinardap vacia')
                    }
                });
            } else {
                console.log('Error consumo dinardap: ' + err)
            }
            listadevuelta.push(persona)
        }
        );
        callback(null, listadevuelta);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

module.exports = router;