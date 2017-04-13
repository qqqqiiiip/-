var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mysql = require('mysql');
var net = require('net');
var server = net.createServer();
var EventEmitter = require('events').EventEmitter; 
var event = new EventEmitter();
var EqData = {
  id: -1,
  date: new Date(Date.now() + (8 * 60 * 60 * 1000)),
  temp: 0,
  humidity: 0,
  door: 0,
  fan: 0,
  light_0: 0,
  light_1: 0,
  light_2: 0,
  light_3: 0,
  photosensitive:0,
  infrared:0,
  smoke:0,
  air:0,
  warning:0
};
var UpData = {
  name : null,
  value: null
}

//socket
server.listen(9000,function(){
  console.log("");
});

//连接成功
server.on('connection', function(client){
  //发送连接成功
 
  //EventEmitter
  event.on('requestToggle', function() {
    client.write(JSON.stringify(UpData));
    console.log(JSON.stringify(UpData));
  });

  //接收客户端数据
  client.on('data', function(data){
  	if(isJson(data)){
		var data = JSON.parse(data);
	    console.log(data);
	    for (let x in data){
	      EqData[x] = data[x];
	    }
	    EqData.date = new Date(Date.now() + (8 * 60 * 60 * 1000));
	    connection.query('insert into IOT(date,temp,humidity,fan,door,light_0,light_1,light_2,light_3,photosensitive,infrared,smoke,air,warning) value(now()' + ',' + '"' + EqData.temp + '"' + ',' + '"' + EqData.humidity + '"' + ',' + EqData.fan + ',' + '"' + EqData.door + '"' + ',' + '"' + EqData.light_0 + '"' + ',' + '"' + EqData.light_1 + '"' + ',' + '"' + EqData.light_2 + '"' + ','  + EqData.light_3 + ','  + EqData.photosensitive + ','  + EqData.infrared + ','  + EqData.smoke + ','  + EqData.air + ','  + EqData.warning + ')', function(err, rows, fields) {
	      if (err) throw err;
	    });
	    event.emit('autoSendData');
	  }
	  else {
      data = data.toString();
      data = data.split("}");
      data.length-=1;
      for(let x=0;x<data.length;x++){
        data[x]+="}";
        console.log(data[x]);
      }

      for(let m=0;m<data.length;m++){
        var data2 = JSON.parse(data[m]);
        for (let x in data2){
          EqData[x] = data2[x];
        }
        EqData.date = new Date(Date.now() + (8 * 60 * 60 * 1000));
        connection.query('insert into IOT(date,temp,humidity,fan,door,light_0,light_1,light_2,light_3,photosensitive,infrared,smoke,air,warning) value(now()' + ',' + '"' + EqData.temp + '"' + ',' + '"' + EqData.humidity + '"' + ',' + EqData.fan + ',' + '"' + EqData.door + '"' + ',' + '"' + EqData.light_0 + '"' + ',' + '"' + EqData.light_1 + '"' + ',' + '"' + EqData.light_2 + '"' + ','  + EqData.light_3 + ','  + EqData.photosensitive + ','  + EqData.infrared + ','  + EqData.smoke + ','  + EqData.air + ','  + EqData.warning + ')', function(err, rows, fields) {
          if (err) throw err;
        });
        event.emit('autoSendData');
      }
    }
  });
  //连接结束
  client.on('end', function(){
    console.log('socket connection end');
    event.removeAllListeners('requestToggle');
  })
});
function isJson(str){
	var n = str.toString().match(/\{/g)||[];
	console.log("匹配的命中次数:"+n.length);
	if(n.length==1){
		return 1;
	}
	else{
		return 0;
	}
	
}

//连接数据库
var connection = mysql.createConnection({
  host: '',
  user: '',
  password: '',
  database: 'IOT' ,
  timezone: '0000' //时区
});
connection.connect();
connection.query('SELECT * from IOT order by date desc limit 1 ', function(err, rows, fields) {
  if(rows){
  	for (let x in rows[0])
  	{
  	  EqData[x] = rows[0][x];
  	}
  }
  
});

//webSocket
app.use(function(req, res, next) {
  res.io = io;	
  next();
});

io.on('connection', function(socket) {
  //接收下拉刷新请求
	socket.on('data', (user, fn) => {
	    fn(EqData);
	    console.log(user,"request data : ",EqData);
	});

  //主动发送数据
  event.on('autoSendData', function() {
    socket.emit('data', EqData);
  });

});

//AJAX
app.get('/toggle', function (req, res) {
  var _callback = req.query.callback;
  if (_callback){
    res.type('text/javascript');
    res.send(_callback + '(' + JSON.stringify(EqData) + ')');
  }
  else{
      res.json(EqData);
  }
  console.log(req.query);
  UpData.name = req.query.name;
  UpData.value = req.query.status;
  event.emit('requestToggle');
});
app.get('/login', function (req, res){
  var cb = {
  	error : 0,
  	id: null,
  }
  connection.query('SELECT passwd FROM user where id = "' + req.query.id+'"', function (err, results, fields) {
    if (err) throw err;
    else if (results){
   	  if(results[0]===undefined){
        console.log("用户名不存在");
        cb.error = 1;
      }
      else if(results[0].passwd!=req.query.passwd){
        console.log("密码错误");
        cb.error = 2;
      }
      else{     
        console.log(results[0]);  
        cb.id = results[0].id;
      }    
      var _callback = req.query.callback;
      if (_callback){
      	res.type('text/javascript');
		res.send(_callback + '(' + JSON.stringify(cb) + ')');
	  }
	  else{
		res.json(cb);
      }
      console.log(req.query);
    }
  });
  
})
http.listen(3000, function() {
  console.log('');
});
