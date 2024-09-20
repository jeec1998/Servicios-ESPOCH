const express = require('express');
const router = express.Router();
const Request = require("request");
const crypto = require('crypto');
const actualizarV2 = require('./../modelo/actualizarV2');
const actualizarDinardapV2 = require('./../rutas/rutaDinardapV2');
const urlAcademico = require('../config/urlAcademico');
const soap = require('soap');
const pathimage = require('path');
const { Console } = require('console');
/* get de discapacidad */
router.get('/personalizadodiscapacidad', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var personadiscapacitada = await new Promise(resolve => { actualizarV2.obtenerdiscapacidad((err, valor) => { resolve(valor); }) });
        if (personadiscapacitada.length > 0) {
            return res.json({
                success: true,
                listado: personadiscapacitada
            });
        }
        else {
            return res.json({
                success: false,
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
router.get('/discapacidad/:cedula', async (req, res) => {
    const cedula = req.params.cedula;
    try {
        var personadiscapacitada = await new Promise(resolve => { actualizarV2.discapacidad(cedula, (err, valor) => { resolve(valor); }) });
        console.log(personadiscapacitada)
        if (personadiscapacitada.length > 0) {
            return res.json({
                success: true,
                listado: personadiscapacitada
            });
        }
        else {
            return res.json({
                success: false,
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
/* ************* */
module.exports = router;