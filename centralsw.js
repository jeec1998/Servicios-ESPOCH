const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const config = require('./config/database');
const app = express();
const sql = require('mssql');
const central = require('./rutas/rutaCentral');
const acceso = require('./rutas/rutacceso');
const dinardap = require('./rutas/rutadinardap');
var fs = require('fs');
var http = require('http');
var https = require('https');

var connection = new sql.ConnectionPool(config);
connection.connect(function (err) {
    if (err) {
        console.error('Error en la Conexion de la Base de Datos', err.stack)
    } else {        
        console.log('Conexion Base de Datos CENTRALIZADA')
    }
});


//Port Number
const port = 8099;
//const port = process.env.PORT||8080;

//Cors Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE');
    next();
});

//Set Static Folder
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));//

app.use('/rutaAcceso', acceso);
app.use('/rutaCentral', central);
app.use('/rutadinardap', dinardap);


///app.use('/Seguridad', Seguridad);

//Index Router
app.get('/', (req, res) => {
    res.send('Invalid Endpoint');
});

var options = {
    key: fs.readFileSync('Certificados/espoch_edu_ec.key'),
    cert: fs.readFileSync('Certificados/espoch_edu_ec_2023.crt'),
    ca: fs.readFileSync('Certificados/espoch_edu_ec_ca.crt')
};

app.use(function (req, resp, next) {
    if (req.headers['x-forwarded-proto'] == 'http') {
        return resp.redirect(301, 'https://' + req.headers.host + '/');
    } else {
        return next();
    }
});


http.createServer(app).listen(8098)
https.createServer(options, app).listen(port);