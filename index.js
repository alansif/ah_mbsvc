//const moment = require('moment')

const sql = require('mssql');

const config80 = {
    user: 'sa',
    password: 'sina.com.1',
    server: '192.168.100.80',
    database: 'MyWebFlow',
    options: {
        useUTC: false
    }
};

const pool80 = new sql.ConnectionPool(config80, err => {
    if (err)
    console.log(err);
});

pool80.on('error', err => {
    console.log(err);
});

const config253 = {
    user: 'sa',
    password: 'hxrt',
    server: '192.168.100.253',
    database: 'HZNewDB'
};

const pool253 = new sql.ConnectionPool(config253, err => {
    if (err)
        console.log(err);
});

pool253.on('error', err => {
    console.log(err);
});

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length,Authorization,Accept,X-Requested-With");
    res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
    res.header("Content-Type", "application/json;charset=utf-8");
    if(req.method==="OPTIONS") res.sendStatus(200);/*让options请求快速返回*/
    else next();
});

let sql_guestinfo = "select Name, Sex, Mobile, Address from T_Guest_Info where PaperValue=@id";

app.get('/api/v1/guest/:id/info', function(req, res){
    const id = req.params['id'];
    let f = async function() {
        try {
            let result = await pool253.request().input('id', id).query(sql_guestinfo);
            if (result.recordset.length === 0) {
                res.status(404).json({status:{code:1}});
            } else {
                res.status(200).json({status:{code:0},data:result.recordset});
            }
        } catch(err) {
            console.log(err);
            res.status(500).json(err);
        }
    };
    f();
});

app.use(function(req, res){
    console.log(req.headers);
    console.log(req.body);
    res.status(404).json({status:"Not found"});
});

const server = app.listen(8166, "0.0.0.0", function() {
    console.log('listening on port %d', server.address().port);
});