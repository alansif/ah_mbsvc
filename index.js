//const moment = require('moment')

const config80 = require('./config').config80;

const sql = require('mssql');

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
let sql_privileges = "select buttonname from Tr_member_moduleinfo where Suser = @userid";

app.post('/api/v1/login', function(req, res){
	const username = req.body.username || '';
	const password = req.body.password || '';
	let f = async function() {
		try {
			let result = await pool80.request().input('userid', username).query(sql_login);
			if (result.recordset.length === 0) {
				res.status(401).json({status:{code:101,message:'没有这个用户'}});
			} else if (result.recordset[0]['用户密码'] !== password) {
				res.status(401).json({status:{code:102,message:'密码错误'}});
			} else {
			    let r1 = await pool80.request().input('userid', username).query(sql_privileges);
				res.status(200).json({status:{code:0,message:'ok'},data:{username:result.recordset[0]['用户姓名'],privileges:r1.recordset.map(v=>v['buttonname'])}});
			}
		} catch(err) {
			console.error(err);
            		res.status(500).end();
		}
	};
	f();
});

let sql_guestinfo = "select Name, Sex, Mobile, Address, Email, Remarks from T_Guest_Info where PaperValue=@id";

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

app.get('/api/v1/card', function(req, res) {
	const id = req.query['id'] || '';
	const all = req.query['all'] === 'true' ;
    if (id.length !== 18) {
        res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
        return;
    }
	(async () => {
		try {
		    let s = "select * from Tr_member_Cardbaseinfo WHERE 身份证号码=@id";
		    if (!all) s += " AND 会员状态<>'已经停用'";
		    s += " order by ID desc";
            let result = await pool80.request().input('id', id).query(s);
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'此证件号码尚未办卡或卡已停用'}});
            } else {
                res.status(200).json({status:{code:0,message:'ok'},data:result.recordset[0]});
			}
		} catch (err) {
            console.error(err);
            res.status(500).end();
        }
	})();
});

app.get('/api/v1/query/keyword', function(req, res) {
    const kw = req.query['keyword'] || '########';
    (async () => {
        try {
            let result = await pool80.request().input('kw',kw)
                .query("select * from Tr_member_Cardbaseinfo WHERE (卡号=@kw OR 姓名=@kw OR 联系电话=@kw) AND 会员状态<>'已经停用'");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'无此卡或卡已停用'}});
            } else {
                res.status(200).json({status:{code:0,message:'ok'},data:result.recordset});
            }
        } catch (err) {
            console.error(err);
            res.status(500).end();
        }
    })();
});

app.get('/api/v1/dossier', function(req, res) {
    const id = req.query['id'] || '';
    if (id.length !== 18) {
        res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
        return;
    }
    let tbname = req.query['tbname'] || '';
    if (id.length === 0) {
        res.status(400).json({status:{code:1002,message:'名称错误'}});
        return;
    }
    tbname = "Tr_member_" + tbname;
    (async () => {
        try {
            let result = await pool80.request().input('id', id).input('tbname', tbname)
                .query(`select * from ${tbname} WHERE 身份证号码=@id`);
            res.status(200).json({status:{code:0,message:'ok'},data:result.recordset});
        } catch (err) {
            console.error(err);
            res.status(500).end();
        }
    })();
});

app.get('/api/v1/query/period', function(req, res){
    let from0 = req.query['from0'] || '';
    let from1 = req.query['from1'] || '';
    let to0 = req.query['to0'] || '';
    let to1 = req.query['to1'] || '';
    if (from0.length === 0) from0 = '2000-01-01';
    if (from1.length === 0) from1 = '2039-12-31';
    from0 += ' 00:00:00';
    from1 += ' 23:59:59';
    if (to0.length === 0) to0 = '2000-01-01';
    if (to1.length === 0) to1 = '2039-12-31';
    to0 += ' 00:00:00';
    to1 += ' 23:59:59';
    (async () => {
        try {
            let result = await pool80.request().input('from0', from0).input('from1', from1).input('to0', to0).input('to1', to1)
                .query(`select top 100 * from Tr_member_Cardbaseinfo WHERE (有效期起始 between @from0 and @from1) AND (有效期截止 between @to0 and @to1)`);
            res.status(200).json({status:{code:0,message:'ok'},data:result.recordset});
        } catch (err) {
            console.error(err);
            res.status(500).end();
        }
    })();
});

app.post('/api/v1/card/:id/changeinfo', function(req, res){
    let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status: {code: 1001, message: '证件号码格式错误'}});
        return;
    }
    let f_chglist = req.body.chglist || [];
    if (f_chglist.length === 0) {
        res.status(400).json({status: {code: 1019, message: '列表为空'}});
        return;
    }
    let f_operator = trim(req.body.operator || '');
    (async () => {
        try {
            result = await pool80.request().input('idnum', id)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用'");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'不是会员或会员卡已停用'}});
                return;
            }
            const r = result.recordset[0];
            const f_userid = r['UserID'];
            const f_cardid = r['卡号'];
            const f_name = r['姓名'];
            const f_sex = r['性别'];
            const s1 = "INSERT INTO Tr_member_ChangeInfo(UserID,卡号,姓名,性别,身份证号码,操作日期,操作人员,修改项目,修改前,修改后) " +
                "VALUES(@uid,@cid,@username,@sex,@idnum,GETDATE(),@operator,@entry,@oldv,@newv)";
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
                (async function(){
                    for(let c of f_chglist) {
                        let k = c.entry;
                        let oldv = r[k];
                        let newv = c.value;
                        let s2 = `UPDATE Tr_member_Cardbaseinfo SET ${k}=@newv WHERE 身份证号码=@idnum AND 会员状态<>'已经停用'`;
                        await trans.request().input('idnum',id).input('newv',newv).query(s2);
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('username',f_name).input('sex',f_sex).input('idnum',id)
                            .input('operator',f_operator).input('entry',k).input('oldv',oldv).input('newv',newv).query(s1);
                    }
                    try {
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'操作成功'},data:{}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
        }catch(err) {
            console.error(err);
            res.status(500).end();
        }
    })();
});

app.post('/api/v1/card/:id/changeperiod', function(req, res) {
    let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status: {code: 1001, message: '证件号码格式错误'}});
        return;
    }
    let f_period0 = trim(req.body.period0 || '');
    let f_period1 = trim(req.body.period1 || '');
    let f_comment = trim(req.body.comment || '');
    let f_operator = trim(req.body.operator || '');
    (async () => {
		try {
            result = await pool80.request().input('idnum', id)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用'");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'不是会员或会员卡已停用'}});
                return;
            }
            const r = result.recordset[0];
            const f_userid = r['UserID'];
            const f_cardid = r['卡号'];
            const f_name = r['姓名'];
            const f_sex = r['性别'];
            const f_oldp0 = r['有效期起始'];
            const f_oldp1 = r['有效期截止'];
            const s1 = "UPDATE Tr_member_Cardbaseinfo SET 有效期起始=@p0,有效期截止=@p1 WHERE 身份证号码=@idnum";
            const s2 = "INSERT INTO Tr_member_ChangePeriod(UserID,卡号,姓名,性别,身份证号码,原有效期起始,原有效期截止,新有效期起始,新有效期截止,备注,操作日期,操作人员) " +
				"VALUES(@uid,@cid,@username,@sex,@idnum,@oldp0,@oldp1,@newp0,@newp1,@comment,GETDATE(),@operator)";
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
                (async function(){
                    await trans.request().input('idnum',id).input('p0',f_period0).input('p1',f_period1).query(s1);
                    await trans.request().input('uid',f_userid).input('cid',f_cardid).input('username',f_name).input('sex',f_sex).input('idnum',id)
						.input('oldp0',f_oldp0).input('oldp1',f_oldp1).input('newp0',f_period0).input('newp1',f_period1).input('comment',f_comment)
						.input('operator',f_operator).query(s2);
                    try {
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'操作成功'},data:{}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
		}catch(err) {
            console.error(err);
            res.status(500).end();
		}
	})();
});

app.post('/api/v1/card/:id/refund', function(req, res) {
    let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status: {code: 1001, message: '证件号码格式错误'}});
        return;
    }
    let f_operator = trim(req.body.operator || '');
    (async () => {
            try {
                result = await pool80.request().input('idnum', id)
                    .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用'");
                if (result.recordset.length === 0) {
                    res.status(400).json({status:{code:1005,message:'不是会员或会员卡已停用'}});
                    return;
                }
                const r = result.recordset[0];
                const f_userid = r['UserID'];
                const f_cardid = r['卡号'];
                const f_name = r['姓名'];
                const f_sex = r['性别'];
                const f_amount = r['账户余额'];
                const s1 = "UPDATE Tr_member_CardStatus SET 卡状态=0,旧卡号='TK0000',描述='退卡可以重新使用',操作日期=GETDATE(),操作人员=@operator,标记='Y' "
					+ "WHERE UserID=@uid AND 卡状态=1";
                const s2 = "UPDATE Tr_member_Cardbaseinfo SET 会员状态='已经停用',操作日期=GETDATE(),操作人员=@operator,标记='Y' "
                    + "WHERE UserID=@uid AND 会员状态<>'已经停用'";
                const s3 = "INSERT INTO Tr_member_ReturnCardinfo(UserID,卡号,姓名,性别,身份证号码,联系电话,通讯地址,健康顾问,退卡日期,操作人员,退卡金额,退卡门店,标记) " +
					"VALUES(@uid,@cid,@username,@sex,@idnum,@mobile,@address,@advisor,GETDATE(),@operator,@amount,'总部','Y')";
                const s4 = "INSERT INTO Tr_member_Moneydetail(UserID,卡号,收款门店,收款日期,收款类型,项目名称,收款金额,收款人员,姓名,性别,身份证号码,标记) " +
                    "VALUES(@uid,@cid,'总部',GETDATE(),'会员退卡','退卡余额',-@amount,@operator,@username,@sex,@idnum,'Y')";
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
                    (async function(){
                    	await trans.request().input('uid',f_userid).input('operator',f_operator).query(s1);
                        await trans.request().input('uid',f_userid).input('operator',f_operator).query(s2);
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('username',f_name).input('sex',f_sex).input('idnum',id)
							.input('mobile',r['联系电话']).input('address',r['通讯地址']).input('advisor',r['健康顾问'])
                            .input('operator',f_operator).input('amount',f_amount).query(s3);
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('username',f_name).input('sex',f_sex).input('idnum',id)
                            .input('operator',f_operator).input('amount',f_amount).query(s4);
                        try {
                            trans.commit(err_cm => {
                                if (err_cm) {
                                    console.error('commit failed');
                                    res.status(500).end();
                                    return;
                                }
                                res.status(200).json({status:{code:0,message:'退卡成功'},data:{}});
                            });
                        } catch(err) {
                            if (!rolledBack) {
                                rolledBack = true;
                                trans.rollback(err_rb => {
                                    if (err_rb) {
                                        console.error('rollback failed');
                                    }
                                });
                            }
                            console.error(err);
                            res.status(500).end();
                        }
                    })();
                });
            } catch(err) {
                console.error(err);
                res.status(500).end();
            }
        }
    )();
});

app.post('/api/v1/card/:id/consume', function(req, res) {
    let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status: {code: 1001, message: '证件号码格式错误'}});
        return;
    }
    let f_ctm = parseFloat(req.body.ctm);
    let f_adt = parseFloat(req.body.adt);
    let f_oth = parseFloat(req.body.oth);
    let f_sum = f_ctm + f_adt + f_oth;
    if (isNaN(f_ctm) || isNaN(f_adt) || isNaN(f_oth) || (f_sum === 0)) {
        res.status(400).json({status:{code:1003,message:'金额填写错误'}});
        return;
    }
    let f_ctmcomment = trim(req.body.ctmcomment || '');
    let f_adtcomment = trim(req.body.adtcomment || '');
    let f_othcomment = trim(req.body.othcomment || '');
    let f_operator = trim(req.body.operator || '');
    (async () => {
        try {
            result = await pool80.request().input('idnum', id)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用' AND GETDATE()<=有效期截止");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'会员卡已停用或已过期'}});
                return;
            }
            const r = result.recordset[0];
            if (r['账户余额'] < f_sum) {
                res.status(400).json({status:{code:1005,message:'账户余额不足'}});
                return;
			}
            const f_userid = r['UserID'];
            const f_cardid = r['卡号'];
            const f_name = r['姓名'];
            const f_sex = r['性别'];
            const s1 = "INSERT INTO Tr_member_ConsumeRecord(UserID,卡号,体检门店,项目名称,消费金额,体检日期,操作日期,操作人员,备注,姓名,性别,身份证号码,标记) " +
					"VALUES(@uid,@cid,'总部',@item,@amount,GETDATE(),GETDATE(),@operator,@comment,@username,@sex,@idnum,'Y')";
            const s2 = "INSERT INTO Tr_member_ConsumeRecordByCardMoney(UserID,卡号,体检门店,刷卡金额,体检日期,操作日期,操作人员,姓名,性别,身份证号码,消费类型,标记) " +
					"VALUES(@uid,@cid,'总部',@sum,GETDATE(),GETDATE(),@operator,@username,@sex,@idnum,'现金','Y')";
            const s3 = "UPDATE Tr_member_Cardbaseinfo SET 日常消费=日常消费+@sum,账户余额=账户余额-@sum WHERE 身份证号码=@idnum AND 会员状态<>'已经停用'";
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
                (async function(){
                	if (f_ctm > 0) {
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('item','定制费').input('amount',f_ctm)
                            .input('operator',f_operator).input('comment',f_ctmcomment).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s1);
					}
                    if (f_adt > 0) {
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('item','加项费').input('amount',f_adt)
                            .input('operator',f_operator).input('comment',f_adtcomment).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s1);
                    }
                    if (f_oth > 0) {
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('item','其他').input('amount',f_oth)
                            .input('operator',f_operator).input('comment',f_othcomment).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s1);
                    }
                    await trans.request().input('uid',f_userid).input('cid',f_cardid).input('sum',f_sum).input('operator',f_operator)
                        .input('username',f_name).input('sex',f_sex).input('idnum',id).query(s2);
                    await trans.request().input('sum',f_sum).input('idnum',id).query(s3);
                    try {
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'操作成功'},data:{}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
        } catch(err) {
            console.error(err);
            res.status(500).end();
        }
	})();
});

app.post('/api/v1/card/:id/deposit', function(req, res) {
    let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
        return;
    }
    let f_amount = parseFloat(req.body.amount);
    if (isNaN(f_amount)) {
        res.status(400).json({status:{code:1003,message:'金额填写错误'}});
        return;
    }
    let f_dptype = "";
    const dpt = trim(req.body.dptype || '');
    if (dpt === '1') {
    	f_dptype = "账户预存";
	} else if (dpt === '2') {
        f_dptype = "账户赠送";
	} else {
        res.status(400).json({status:{code:1003,message:'预存类型错误'}});
    	return;
	}
    let f_comment = trim(req.body.comment || '');
    let f_operator = trim(req.body.operator || '');
    (async () => {
    	try {
            result = await pool80.request().input('idnum', id)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用' AND GETDATE()<=有效期截止");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'会员卡已停用或已过期'}});
                return;
            }
            const r = result.recordset[0];
            const f_userid = r['UserID'];
            const f_cardid = r['卡号'];
            const f_name = r['姓名'];
            const f_sex = r['性别'];
            const s1 = "INSERT INTO Tr_member_Moneydetail(UserID,卡号,收款门店,收款日期,收款类型,项目名称,收款金额,收款人员,姓名,性别,身份证号码,备注,标记) " +
					"VALUES(@uid,@cid,'总部',GETDATE(),'日常储值',@dpt,@amount,@operator,@username,@sex,@idnum,@comment,'Y')";
            const s2 = "UPDATE Tr_member_Cardbaseinfo SET 账户预存=账户预存+@amount,账户余额=账户余额+@amount,标记='Y' WHERE 身份证号码=@idnum AND 会员状态<>'已经停用'";
            const s3 = "UPDATE Tr_member_Cardbaseinfo SET 赠券金额=赠券金额+@amount,赠券余额=赠券余额+@amount,标记='Y' WHERE 身份证号码=@idnum AND 会员状态<>'已经停用'";
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
                (async function(){
                    await trans.request().input('uid',f_userid).input('cid',f_cardid).input('dpt',f_dptype).input('amount',f_amount)
						.input('operator',f_operator).input('username',f_name).input('sex',f_sex).input('idnum',id).input('comment',f_comment).query(s1);
                    if (dpt === '1') {
                        await trans.request().input('amount',f_amount).input('idnum',id).query(s2);
					} else if (dpt === '2') {
                        await trans.request().input('amount',f_amount).input('idnum',id).query(s3);
					}
                    try {
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'预存成功'},data:{}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
		} catch(err) {
            console.error(err);
            res.status(500).end();
        }
    }
	)();
});

app.post('/api/v1/card/:id/transfer', function(req, res) {
    const id0 = req.params['id'];
    const id1 = req.body['id1'] || '';
    if ((id0.length !== 18) || (id1.length !== 18)) {
        res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
        return;
    }
    let f_fee = parseFloat(req.body.fee);
    if (isNaN(f_fee)) {
        res.status(400).json({status:{code:1003,message:'转卡费填写错误'}});
        return;
    }
    let f_altphone = trim(req.body.altphone || '');
    let f_operator = trim(req.body.operator || '');
	(async () => {
		try {
            let result0 = await pool80.request().input('idnum', id0)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用' AND GETDATE()<=有效期截止");
            if (result0.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'会员卡已停用或已过期'}});
                return;
            }
            const r0 = result0.recordset[0];
            let result = await pool80.request().input('idnum', id1)
                .query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum AND 会员状态<>'已经停用'");
            if (result.recordset.length !== 0) {
                res.status(400).json({status:{code:1012,message:'不能转卡到现有会员'}});
                return;
            }
            let resultz = await pool253.request().input('id', id1)
                .query("select * from T_Guest_Info where (papervalue = @id) and (isvip like '%黑色%' OR isvip like '%棕色%')");
            if (resultz.recordset.length !== 0) {
                res.status(400).json({status:{code:1004,message:'此客户为黑色或棕色客户'}});
                return;
            }
            let result1 = await pool253.request().input('id', id1)
                .query("select * from T_Guest_Info where papervalue = @id");
            if (result1.recordset.length === 0) {
                res.status(400).json({status:{code:1006,message:'未找到此证件号码的客户'}});
                return;
            }
            const r1 = result1.recordset[0];
            const s1 = "UPDATE Tr_member_Cardbaseinfo SET 会员状态='已经停用',操作日期=GETDATE(),操作人员=@operator,标记='Y' " +
					"WHERE 身份证号码=@id0 AND 会员状态<>'已经停用'";
            const s2 = "INSERT INTO Tr_member_Cardbaseinfo(UserID,卡号,姓名,性别,身份证号码,联系电话,通讯地址,用户密码,操作日期,操作人员,会员状态," +
					"会员期限类别,益生套餐,采购健老,首次采购价格,享受折扣,有效期起始,有效期截止,签发日期,健康顾问,发卡门店,卡片开启,备注,定制电话," +
					"账户预存,日常消费,账户余额,已用益生套餐,已用采购健老,会员经理,赠券金额,赠券消费,赠券余额,标记,电子邮件) " +
					"VALUES(@uid,@cid,@username,@sex,@id1,@mobile,@address,@passwd,GETDATE(),@operator,'会员转卡'," +
					"@level,@tc,@jl,@price,@discount,@period0,@period1,@issuedt,@advisor,@shop,@status,@comment,@altphone," +
					"@z1,@z2,@z3,@z4,@z5,@z6,@z7,@z8,@z9,'Y',@email)";
            const s3 = "INSERT INTO Tr_member_ChangeCardinfo(UserID,卡号,原姓名,原性别,原身份证号码,转卡日期,操作人员,姓名,性别,身份证号码,用户密码,联系电话,通讯地址,转卡门店,定制电话,标记) " +
					"VALUES(@uid,@cid,@username0,@sex0,@id0,GETDATE(),@operator,@username,@sex,@id1,@passwd,@mobile,@address,'总部',@altphone,'Y')";
            const s4 = "INSERT INTO Tr_member_Moneydetail(UserID,卡号,收款门店,收款日期,收款类型,项目名称,收款金额,收款人员,姓名,性别,身份证号码,标记) " +
					"VALUES(@uid,@cid,'总部',GETDATE(),'会员转卡','转卡费',@fee,@operator,@username,@sex,@id1,'Y')";
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
                (async function(){
                    try {
                        await trans.request().input('operator',f_operator).input('id0',id0).query(s1);
                        await trans.request().input('uid',r0['UserID']).input('cid',r0['卡号']).input('username',r1['Name']).input('sex',r1['Sex'])
                            .input('id1',id1).input('mobile',r1['Mobile']).input('address',r1['Address']).input('passwd',r0['用户密码'])
                            .input('operator',f_operator).input('level',r0['会员期限类别']).input('tc',r0['益生套餐']).input('jl',r0['采购健老'])
                            .input('price',r0['首次采购价格']).input('discount',r0['享受折扣']).input('period0',r0['有效期起始']).input('period1',r0['有效期截止'])
                            .input('issuedt',r0['签发日期']).input('advisor',r0['健康顾问']).input('shop',r0['发卡门店']).input('status',r0['卡片开启'])
                            .input('comment',r0['备注']).input('altphone',f_altphone).input('z1',r0['账户预存']).input('z2',r0['日常消费'])
                            .input('z3',r0['账户余额']).input('z4',r0['已用益生套餐']).input('z5',r0['已用采购健老']).input('z6',r0['会员经理'])
                            .input('z7',r0['赠券金额']).input('z8',r0['赠券消费']).input('z9',r0['赠券余额']).input('email',r1['Email']).query(s2);
                        await trans.request().input('uid',r0['UserID']).input('cid',r0['卡号']).input('username0',r0['姓名']).input('sex0',r0['性别'])
							.input('id0',id0).input('operator',f_operator).input('username',r1['Name']).input('sex',r1['Sex']).input('id1',id1)
                            .input('passwd',r0['用户密码']).input('mobile',r1['Mobile']).input('address',r1['Address']).input('altphone',f_altphone)
							.query(s3);
                        await trans.request().input('uid',r0['UserID']).input('cid',r0['卡号']).input('fee',f_fee).input('operator',f_operator)
							.input('username',r1['Name']).input('sex',r1['Sex']).input('id1',id1).query(s4);
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'转卡成功'},data:{}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
		} catch(err) {
            console.error(err);
            res.status(500).end();
        }
	})();
});

app.post('/api/v1/card/:id/renew', function(req, res) {
	let id = req.params['id'];
    if (id.length !== 18) {
        res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
        return;
    }
    let f_price = parseFloat(req.body.price);
    if (isNaN(f_price)) {
        res.status(400).json({status:{code:1003,message:'价格填写错误'}});
        return;
    }
    let f_period0 = trim(req.body.period0 || '');
    let f_period1 = trim(req.body.period1 || '');
    let f_mode = req.body.mode || '连续续卡';
    let f_operator = trim(req.body.operator || '');
	(async () => {
        try {
            let result = await pool253.request().input('id', id)
				.query("select * from T_Guest_Info where (papervalue = @id) and (isvip like '%黑色%' OR isvip like '%棕色%')");
            if (result.recordset.length !== 0) {
                res.status(400).json({status:{code:1004,message:'此客户为黑色或棕色客户'}});
                return;
            }
            result = await pool80.request().input('idnum', id)
				.query("select * from Tr_member_Cardbaseinfo where 身份证号码=@idnum order by ID desc");
            if (result.recordset.length === 0) {
                res.status(400).json({status:{code:1005,message:'未找到此证件号码的客户'}});
                return;
            }
            const r = result.recordset[0];
            if ((f_mode === '连续续卡') && (r['会员状态'] === '已经停用')) {
                res.status(400).json({status:{code:1006,message:'此客户会员卡已经停用'}});
                return;
            }
/*
			if (r['首次采购价格'] < f_price / 3.0) {
                res.status(400).json({status:{code:1006,message:'续卡价格高于首次采购价格'}});
                return;
			}
*/
            const f_userid = r['UserID'];
            const f_cardid = r['卡号'];
            const f_name = r['姓名'];
            const f_sex = r['性别'];
            const s1 = "INSERT INTO Tr_member_CardAddYearinfo(UserID,卡号,会员期限类别,益生套餐,采购健老,有效期起始,有效期截止,续卡门店,续卡日期,操作人员,采购价格,姓名,性别,身份证号码,标记)" +
				"VALUES(@uid,@cid,'3',3,0,@period0,@period1,'总部',GETDATE(),@operator,@price,@username,@sex,@idnum,'Y')";
            const s2 = "INSERT INTO Tr_member_Moneydetail(UserID,卡号,收款类型,项目名称,收款金额,收款门店,收款日期,收款人员,姓名,性别,身份证号码,标记)" +
                "VALUES(@uid,@cid,'会员续卡','益生套餐',@price,'总部',GETDATE(),@operator,@username,@sex,@idnum,'Y')";
            const s3a = "UPDATE Tr_member_Cardbaseinfo SET 会员期限类别='3',益生套餐=益生套餐+3,使用分类=@mode," +
				"首次采购价格=@price,有效期起始=@period0,有效期截止=@period1,标记='Y' WHERE 身份证号码=@idnum AND 会员状态<>'已经停用'";
            const s3b = "UPDATE Tr_member_Cardbaseinfo SET 会员期限类别='3',益生套餐=3,使用分类=@mode,会员状态='新卡使用'," +
                "首次采购价格=@price,有效期起始=@period0,有效期截止=@period1,标记='Y' WHERE 身份证号码=@idnum AND 会员状态='已经停用'";
            const s3 = r['会员状态'] === '已经停用' ? s3b : s3a;
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
                (async function(){
                    try {
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('period0',f_period0).input('period1',f_period1)
                            .input('operator',f_operator).input('price',f_price).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s1);
                        await trans.request().input('uid',f_userid).input('cid',f_cardid).input('price',f_price)
                            .input('operator',f_operator).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s2);
                        await trans.request().input('mode',f_mode).input('price',f_price / 3.0).input('period0',f_period0).input('period1',f_period1)
							.input('idnum',id).query(s3);
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'续卡成功'},data:{uid:f_userid,cid:f_cardid}});
                        });
                    } catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        console.error(err);
                        res.status(500).end();
                    }
                })();
            });
        } catch(err) {
            console.error(err);
            res.status(500).end();
        }
	})();
});

app.post('/api/v1/card', function(req, res) {
	let id = req.body.id || '';
	if (id.length !== 18) {
		res.status(400).json({status:{code:1001,message:'证件号码格式错误'}});
		return;
	}
    let f_name = trim(req.body.name || '');
    if (f_name.length === 0) {
        res.status(400).json({status:{code:1002,message:'需要姓名'}});
        return;
    }
	let f_price = parseFloat(req.body.price);
	if (isNaN(f_price)) {
		res.status(400).json({status:{code:1003,message:'价格填写错误'}});
		return;
	}
	id = trim(id).toUpperCase();
	let f_sex = trim(req.body.sex || '');
	let f_mobile = trim(req.body.mobile || '');
	let f_address = trim(req.body.address || '');
    let f_email = trim(req.body.email || '');
	let f_period0 = trim(req.body.period0 || '');
	let f_period1 = trim(req.body.period1 || '');
	let f_advisor = trim(req.body.advisor || '');
	let f_altphone = trim(req.body.altphone || '');
	let f_comment = trim(req.body.comment || '');
	let f_operator = trim(req.body.operator || '');
	let f = async function() {
		try {
            let result = await pool253.request().input('id', id)
                .query("select * from T_Guest_Info where (papervalue = @id) and (isvip like '%黑色%' OR isvip like '%棕色%')");
            if (result.recordset.length !== 0) {
                res.status(400).json({status:{code:1004,message:'此客户为黑色或棕色客户'}});
                return;
            }
			result = await pool80.request().input('id', id)
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
			const s1 = "INSERT INTO Tr_member_CardStatus(UserID,卡号,卡状态,描述,操作人员,操作日期,开卡门店,标记) " +
					"VALUES(@uid,@cid,1,'已发卡投入使用',@operator,GETDATE(),'总部','Y')";
			const s2 = "INSERT INTO Tr_member_Cardbaseinfo(UserID,卡号,姓名,性别,身份证号码,联系电话,通讯地址,会员期限类别,益生套餐,采购健老,首次采购价格," +
					"有效期起始,有效期截止,签发日期,用户密码,健康顾问,发卡门店,会员状态,操作日期,操作人员,卡片开启,备注,使用分类,定制电话,标记,电子邮件) " +
					"VALUES(@uid,@cid,@username,@sex,@idnum,@mobile,@address,'3',3,0,@price,@period0,@period1,GETDATE(),'888888',@advisor,'总部'," +
					"'新卡使用',GETDATE(),@operator,'开启',@comment,'新会员',@altphone,'Y',@email)";
			const s3 = "INSERT INTO Tr_member_Moneydetail(UserID,卡号,收款类型,项目名称,收款金额,收款门店,收款日期,收款人员,姓名,性别,身份证号码,标记) " +
					"VALUES(@uid,@cid,'首次入会','益生套餐',@price,'总部',GETDATE(),@operator,@username,@sex,@idnum,'Y')";
			const s4 = "INSERT INTO Tr_member_RegCardinfo(UserID,卡号,姓名,性别,身份证号码,联系电话,通讯地址,健康顾问,发卡门店,发卡日期,操作人员,标记) " +
					"VALUES(@uid,@cid,@username,@sex,@idnum,@mobile,@address,@advisor,'总部',GETDATE(),@operator,'Y')";
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
				(async function(){
					try {
                        await trans.request().input('uid',maxuid).input('cid',maxcid).input('operator',f_operator).query(s1);
                        await trans.request().input('uid',maxuid).input('cid',maxcid).input('username',f_name).input('sex',f_sex)
							.input('idnum',id).input('mobile',f_mobile).input('address',f_address).input('price',f_price / 3.0)
							.input('period0',f_period0).input('period1',f_period1).input('advisor',f_advisor).input('operator',f_operator)
							.input('comment',f_comment).input('altphone',f_altphone).input('email',f_email).query(s2);
                        await trans.request().input('uid',maxuid).input('cid',maxcid).input('price',f_price)
							.input('operator',f_operator).input('username',f_name).input('sex',f_sex).input('idnum',id).query(s3);
                        await trans.request().input('uid',maxuid).input('cid',maxcid).input('username',f_name).input('sex',f_sex)
                            .input('idnum',id).input('mobile',f_mobile).input('address',f_address).input('advisor',f_advisor)
                            .input('operator',f_operator).query(s4);
                        trans.commit(err_cm => {
                            if (err_cm) {
                                console.error('commit failed');
                                res.status(500).end();
                                return;
                            }
                            res.status(200).json({status:{code:0,message:'开卡成功'},data:{uid:maxuid,cid:maxcid}});
						});
					} catch(err) {
                        if (!rolledBack) {
                            rolledBack = true;
                            trans.rollback(err_rb => {
                                if (err_rb) {
                                    console.error('rollback failed');
                                }
                            });
                        }
                        res.status(500).end();
					}
				})();
			});
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
