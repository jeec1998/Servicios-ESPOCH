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
        var persona = await new Promise(resolve => { centralizada.obtenerdocumento(cedula, (err, valor) => { resolve(valor); }) });
        if (persona.length > 0) {
            /////////debe verificar si necesita actualizacion
            var listadinardap = await new Promise(resolve => { consumirserviciodinardap(cedula, (err, valor) => { resolve(valor); }) });
            console.log(listadinardap)
            if (listadinardap.length > 0) {
                console.log('Lista dinardap llena')
                let listacamposactualizar = [];
                var campos = await new Promise(resolve => { centralizada.listacamposactualizar((err, valor) => { resolve(valor); }) });
                if (campos.length > 0) {
                    for (camposbase of campos) {
                        listacamposactualizar.push(camposbase);
                    }
                    var datosconyuge = "";
                    var blnconyuge = false;
                    for (campoactualizar of listacamposactualizar) {
                        for (atr of listadinardap) {
                            if (campoactualizar.ca_nombredinardap == atr.campo) {
                                let nombrecampo = atr.campo;
                                console.log(nombrecampo)
                                /*if (nombrecampo.includes("conyuge")) {
                                    datosconyuge = datosconyuge + atr.valor + " ";
                                    blnconyuge = true;
                                }
                                else {
                                    actualizarcamposportipo(campoactualizar.ca_tipo, campoactualizar.ca_nombrecentralizada, campoactualizar.ca_tablacentralizada, atr.valor, persona[0], function (Result) {
                                    })
                                };*/
                            }
                        }
                    }
                    if (blnconyuge) {
                        console.log('Datos conyuge: ' + datosconyuge)
                    }
                }
                else {
                    console.log('No existen registros para actualizar')
                }
            }
            else {
                console.log('Lista dinardap vacia')
            }
        }


        /* {obtenerdatoscedulacentral(cedula, function (Resultado) {
             if (Resultado.length > 0) {
                 if (Resultado[0] != 'X') {
                     var url = UrlAcademico.urlwsdl;
                     var Username = urlAcademico.usuariodinardap;
                     var Password = urlAcademico.clavedinardap;
                     var codigopaquete = urlAcademico.codigoPaq;
                     var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
                     soap.createClient(url, function (err, client) {
                         client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                         client.getFichaGeneral(args, function (err, result) {
                             var jsonString = JSON.stringify(result.return);
                             var objjson = JSON.parse(jsonString);
                             let listacampos = objjson.instituciones[0].datosPrincipales.registros;
                             let listacamposactualizar = [];
                             obtenerlistadecamposamodificar(function (Resultado) {
                                 if (Resultado.length > 0) {
                                     for (camposbase of Resultado) {
                                         listacamposactualizar.push(camposbase);
                                     }
                                     if (listacamposactualizar.length > 0) {
                                         for (campoactualizar of listacamposactualizar) {
                                             for (atr of listacampos) {
                                                 if (campoactualizar.ca_nombredinardap == atr.campo) {
                                                     console.log(atr.campo);
                                                 }
 
                                             }
                                         }
                                     }
                                     else {
                                         console.log('No existen registros para actualizar')
                                     }
                                 }
                             });                      
                                                     });
                     });
                     console.log('CENTRALIZADA')
                     var numerodias = 0;
                     centralizada.obtenerdiasdeconfiguracion(function (Resultado) {
                         if (Resultado != 0) {
                             var numerodias = Resultado;
                         }
                     });
                     var fechasistema = "";
                     fechasistema = Resultado[0].per_fechaModificacion;
                     let fechaactual = new Date()
                     let resta = fechasistema.getTime() - fechaactual.getTime()
                     var resultadoresta = Math.round(resta / (1000 * 60 * 60 * 24))
                     if ((resultadoresta > numerodias) && (numerodias != 0)) {
                         /////consumir la dinardap y actualizar la centralizada
                     }
                     console.log('Resultado resta de fechas: ' + resultadoresta)
                     return res.json({
                         success: true,
                         numerodias: resultadoresta
                     });
                 } else {
                     console.log('DINARDAP')
                     var url = UrlAcademico.urlwsdl;
                     var Username = urlAcademico.usuariodinardap;
                     var Password = urlAcademico.clavedinardap;
                     var codigopaquete = urlAcademico.codigoPaq;
                     var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
                     soap.createClient(url, function (err, client) {
                         client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                         client.getFichaGeneral(args, function (err, result) {
                             let listado = [];
                             listado = result.datospersona;
                             console.log('Listado: ' + listado)
 
                             return res.json({
                                 success: true,
                                 datospersona: result
                             });
                         });
                     });
                 }
             }
             else {
                 console.log('DINARDAP')
                 var url = UrlAcademico.urlwsdl;
                 var Username = urlAcademico.usuariodinardap;
                 var Password = urlAcademico.clavedinardap;
                 var codigopaquete = urlAcademico.codigoPaq;
                 var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
                 soap.createClient(url, function (err, client) {
                     client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
                     client.getFichaGeneral(args, function (err, result) {
                         return res.json({
                             success: true,
                             datospersona: result
                         });
                     });
                 });
             }
         });}*/
    } catch (err) {
        console.log('Error: ' + err)
        return res.json({
            success: false
        });
    }
});



router.get('/verificarfechas/:cedula', (req, res) => {
    const cedula = req.params.cedula;
    try {
        var numerodias = nomenclatura.numerodediasdeconsumo;
        var fechasistema = "";
        obtenerdatoscedulacentral(cedula, function (Resultado) {
            if (Resultado.length > 0) {
                if (Resultado[0] != 'X') {
                    fechasistema = Resultado[0].per_fechaModificacion;
                    let fechaactual = new Date()
                    let resta = fechasistema.getTime() - fechaactual.getTime()
                    var resultadoresta = Math.round(resta / (1000 * 60 * 60 * 24))
                    if (resultadoresta > numerodias) {
                        /////consumir la dinardap y actualizar la centralizada
                    }
                    console.log('Resultado resta de fechas: ' + resultadoresta)
                    return res.json({
                        success: true,
                        numerodias: resultadoresta
                        //valorespagar: result.ValoresAcademicoResult
                    });
                } else {
                    //////consumir el servicio de la dinardap y crear el registro en la centralizada
                    console.log('No existen registros en la base centralizada')
                }
            }
        });
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
                        var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona(tablacentralizada, campocentralizada, idestadocivil, objpersona.per_id, (err, valor) => { resolve(valor); }) });
                        if (actualizacion) {
                            console.log('Estado Civil actualizado correctamente')
                        }
                    }
                    else {
                        console.log('El estado civil no necesita modificacion')
                    }
                    lst.push(estadocivil);
                }
                break;
            case 2:   // separa la cadena de nombres para los parámetros de la centralizada
                /*let listaparametros = [];
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
                            var actualizacion = await new Promise(resolve => { centralizada.actualizarpersona(tablacentralizada, camposcentralizadalst[i], listaparametros[i], idpersona, (err, valor) => { resolve(valor); }) });
                            if (actualizacion) {
                                cont = cont + 1;
                            }
                        }
                        if (cont == camposcentralizadalst.length) {
                            console.log('Nombres y Apellidos actualizados correctamente')
                        }
                    }
                }*/
                break;
            case 3:   // gestiona conyuge verificando el estado civil registrado
                if (valor != "") {
                    console.log("conyuge: " + valor)
                }
                else {
                    console.log("No existe información de conyuge")
                }
                break;
            default:
                text = "Looking forward to the Weekend";
        }
        /*var paralelos = await new Promise(resolve => { Academic.obtenerGestionPeriodosmateriatresparametros(3, carrera, periodo, materia, nivel, (err, valor) => { resolve(valor.recordset); }) });
        for (buscar of paralelos) {
            var buscard = await new Promise(resolve => {
                Academic.totalmatriculados(carrera, periodo, materia, nivel, buscar.strCodParalelo, (err, rep) => { resolve(rep.recordset); })
            });
            if (buscard[0].numeromatriculados < buscar.intCupos)
                lst.push(buscar)
        }*/
        callback(null, lst);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}

function consumirserviciodinardap(cedula, callback) {
    try {
        let listado = [];
        var url = UrlAcademico.urlwsdl;
        var Username = urlAcademico.usuariodinardap;
        var Password = urlAcademico.clavedinardap;
        var codigopaquete = urlAcademico.codigoPaq;
        var args = { codigoPaquete: codigopaquete, numeroIdentificacion: cedula };
        soap.createClient(url, async function (err, client) {
            client.setSecurity(new soap.BasicAuthSecurity(Username, Password));
            client.getFichaGeneral(args, async function (err, result) {
                var jsonString = JSON.stringify(result.return);
                var objjson = JSON.parse(jsonString);
                let listacamposdinardap = objjson.instituciones[0].datosPrincipales.registros;
                for (campos of listacamposdinardap) {
                    listado.push(campos);
                }
                console.log('LISTADO')
                console.log(listado)
            });
        });
        callback(null, listado);
    } catch (err) {
        console.error('Fallo en la Consulta', err.stack)
        return callback(null);
    }
}
module.exports = router;