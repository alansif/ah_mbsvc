//const moment = require('moment')

const sql = require('mssql');

const config80 = {
    user: 'sa',
    password: 'sina.com.1',
    server: '192.168.100.13',
    database: 'HZYS-Server',
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

function trim(str) { 
	return str.replace(/(^\s*)|(\s*$)/g, ""); 
}

let sql_login = "select * from Tr_member_User where [用户代码] = @userid";

app.post('/api/v1/login', function(req, res){
	const username = req.body.username || '';
	const password = req.body.password || '';
	let f = async function() {
		try {
			let result = await pool80.request().input('userid', username).query(sql_login);
			if (result.recordset.length === 0) {
				res.status(401).json({status:{code:101,message:'user not found'}});
			} else if (result.recordset[0]['用户密码'] !== password) {
				res.status(401).json({status:{code:102,message:'wrong password'}});
			} else {
				res.status(200).json({status:{code:0,message:'ok'},data:{username:result.recordset[0]['用户姓名']}});
			}
		} catch(err) {
			console.error(err);
            		res.status(500).end();
		}
	};
	f();
});


let sql_guestinfo = "select Name, Sex, Mobile, Address from T_Guest_Info where PaperValue=@id";

app.get('/api/v1/guest/:id/info', function(req, res){
    const id = req.params['id'];
    let f = async function() {
        try {
            let result = await pool253.request().input('id', id).query(sql_guestinfo);
            if (result.recordset.length === 0) {
                res.status(404).json({status:{code:404,message:'没有查询到此证件号码'}});
            } else {
                res.status(200).json({status:{code:0,message:'ok'},data:result.recordset[0]});
            }
        } catch(err) {
            console.error(err);
            res.status(500).end();
        }
    };
    f();
});

app.post('/api/v1/card', function(req, res) {
	let id = req.body.id || '';
	if (id.length !== 18) {
		res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
		return;
	}
	let f_price = parseFloat(req.body.price);
	if (isNaN(f_price)) {
		res.status(400).json({status:{code:1002,message:'价格填写错误'}});
		return;
	}
	id = trim(id).toUpperCase();
	let f_name = trim(req.body.name || '');
	let f_sex = trim(req.body.sex || '');
	let f_mobile = trim(req.body.mobile || '');
	let f_address = trim(req.body.address || '');
	let f_period0 = trim(req.body.period0 || '');
	let f_period1 = trim(req.body.period1 || '');
	let f_advisor = trim(req.body.advisor || '');
	let f_altphone = trim(req.body.altphone || '');
	let f_comment = trim(req.body.comment || '');
	let f_operator = trim(req.body.operator || '');
	let f = async function() {
		try {
			let result = await pool80.request().input('id', id)
				.query("select * from Tr_member_Cardbaseinfo WHERE 身份证号码=@id");
			if (result.recordset.length !== 0) {
				res.status(400).json({status:{code:1003,message:'此证件号码已办理过会员卡'}});
				return;
			}
			result = await pool80.request()
				.query("select max(UserID) as maxuid from Tr_member_Cardbaseinfo where left(UserID,5) = '00006'");
			let maxuid = result.recordset[0].maxuid || '600000';
			maxuid = parseInt(maxuid) + 1;
			maxuid = '0000' + maxuid;
			result = await pool80.request()
				.query("select max(卡号) as maxcid from Tr_member_Cardbaseinfo where left(卡号,1) = '6'");
			let maxcid = result.recordset[0].maxcid || '600000';
			maxcid = parseInt(maxcid) + 1;
			maxcid = '' + maxcid;
			console.log({maxuid, maxcid});
			let s1 = "INSERT INTO Tr_member_CardStatus(UserID,卡号,卡状态,描述,操作人员,操作日期,开卡门店) ";
			s1 += "VALUES(@uid,@cid,1,'已发卡投入使用',@operator,GETDATE(),'总部')";
			const trans = pool80.transaction();
			trans.begin(err => {
				if (err) {
					console.error(err);
					res.status(500).end();
					return;
				}
				let rolledBack = false;
				trans.on('rollback', aborted => {
					rolledBack = true;
				});
				trans.request().input('uid',maxuid).input('cid',maxcid).input('operator',f_operator).query(s1, (err, result) => {
						if (err) {
							if (!rolledBack) {
								trans.rollback(err_rb => {
									if (err_cb) {
										console.error('rollback failed');
									}
								});
							}
						} else {
							trans.commit(err_cm => {
								if (err_cm) {
									console.error('commit failed');
								}
							});
						}
					});
			});
			res.status(200).json({status:{code:0,message:'ok'}});
		} catch(err) {
			console.error(err);
            		res.status(500).end();
		}
	};
	f();
});

app.use(function(req, res){
    console.log(req.headers);
    console.log(req.body);
    res.status(404).json({status:"Not found"});
});

const server = app.listen(8084, "0.0.0.0", function() {
    console.log('listening on port %d', server.address().port);
});
