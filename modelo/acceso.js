////////credenciales debe consumir desde la base de datos centralizada
const db = require('./../config/databasecentral');
const sql = require('pg');
const { Console } = require('console');
var os = require('os');

module.exports.verificarkey = function (key, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT  * FROM  seguridad.credenciales  WHERE (crekey = '" + key + "')"
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.validarusuariocondatos = function (creuser, crepasswoord, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT  * FROM  seguridad.credenciales  WHERE (creuser = '" + creuser + "') AND (crepasswoord = '" + crepasswoord + "') "
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}

module.exports.verificartoken = function (creuser, crepasswoord, id, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT  * FROM seguridad.token  INNER JOIN seguridad.credenciales ON  token.creid=credenciales.creid WHERE (credenciales.creuser = '" + creuser + "') AND (credenciales.crepasswoord = '" + crepasswoord + "')  AND (token.tokestado=1) AND (token.perid=" + id + ")";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}


module.exports.traertokengenerados = function (id, callback) {
    var conn = new sql.ConnectionPool(db);
    var req = new sql.Request(conn);
    var sentencia;
    sentencia = "SELECT  * FROM seguridad.token WHERE (perid=" + id + ")";
    conn.connect()
        .then(() => {
            req.query(sentencia, (err, recordset) => {
                if (err) {
                    console.error('Fallo en la Consulta', err.stack)
                } else {
                    callback(null, recordset);
                }
                conn.close();
            })
        })
        .catch((err) => {
            console.log('Error: ' + err.stack);
        });
}


module.exports.modificartoken = function (perid, tokestado, estadosesion, Callback) {
    var sentencia;
    sentencia = " UPDATE [seguridad].[token] SET [tokestado]=" + tokestado + ",[estadosesion]=" + estadosesion + " WHERE perid=" + perid + "";
    sql.connect(db, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
        request.query(sentencia, function (err) {
            if (err) { Callback(null, err); }
            else Callback(null, true);
            sql.close();
        });
    });
}

module.exports.deletetokendeproblemas = function (perid, Callback) {
    var sentencia;
    sentencia = " DELETE FROM [seguridad].[token] WHERE perid=" + perid + "";
    sql.connect(db, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
        request.query(sentencia, function (err) {
            if (err) { Callback(null, err); }
            else Callback(null, true);
            sql.close();
        });
    });
}


module.exports.insertartoken = function (creid, perid, toktoken, tokestado, estadosesion, Callback) {
    var date = new Date();
    var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    var fechas = year + "-" + month + "-" + day + " " + hour + ":" + min + ":00";

    var date2 = new Date();
    date2.setDate(date.getDate() + 1);
    var hour = date2.getHours();
    hour = (hour < 10 ? "0" : "") + hour;
    var min = date2.getMinutes();
    min = (min < 10 ? "0" : "") + min;
    var sec = date2.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;
    var year = date2.getFullYear();
    var month = date2.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;
    var day = date2.getDate();
    day = (day < 10 ? "0" : "") + day;
    var fechas2 = year + "-" + month + "-" + day + " " + hour + ":" + min + ":00";

    var sentencia;
    sentencia = "INSERT INTO [seguridad].[token] ([creid],[perid],[toktoken],[tokfechacreacion],[tokfechafin],[tokestado],[estadosesion])"
        + " VALUES(" + creid + ", " + perid + ", '" + toktoken + "', '" + fechas + "', '" + fechas2 + "', " + tokestado + ", " + estadosesion + ");";
    sql.connect(db, function (err) {
        if (err) console.log(err);
        var request = new sql.Request();
        request.query(sentencia, function (err) {
            if (err) { Callback(null, err); }
            else Callback(null, true);
            sql.close();
        });
    });
}
