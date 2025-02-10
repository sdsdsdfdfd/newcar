require('dotenv').config();

// 引入依赖包
const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const WebSocket = require('ws');  // 引入 WebSocket

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 设置 MySQL 连接
const db = mysql.createConnection({
  host: process.env.DB_HOST,    
  user: process.env.DB_USER,         
  password: process.env.DB_PASSWORD,       
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME
});

// 连接 MySQL 数据库
db.connect((err) => {
  if (err) {
    console.error('数据库连接失败:', err);
    return;
  }
  console.log('数据库连接成功');
});

// WebSocket 服务器
const wss = new WebSocket.Server({ port: process.env.WS_PORT || 4000 });

// WebSocket 客户端连接后会调用该函数来推送数据
function notifyFrontend(newData) {
  // 将数据推送给所有已连接的 WebSocket 客户端
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(newData));  // 推送数据到前端
    }
  });
}

wss.on('connection', ws => {
  console.log('客户端已连接');
  // 客户端连接后可以进行的其他操作
});

// 获取小车传感器数据
app.get('/api/car/sensors', (req, res) => {
  const page = req.query.page || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const query = `SELECT * FROM car LIMIT ${limit} OFFSET ${offset}`;

  db.query(query, (err, results) => {
    if (err) {
      console.error('数据查询失败:', err);
      return res.status(500).json({ message: '查询数据失败' });
    }
    res.status(200).json(results);
  });
});

// 处理小车传感器数据
app.post('/api/car/sensor', (req, res) => {
  const { temperature, humidity, smoke, speed } = req.body;

  // 检查数据是否为空
  if (temperature == null || humidity == null || smoke == null || speed == null) {
    return res.status(400).json({ message: '温度、湿度、烟雾浓度和速度数据不能为空' });
  }

  // 插入数据到 MySQL
  const query = 'INSERT INTO car (温度, 湿度, 烟雾浓度, 速度) VALUES (?, ?, ?, ?)';
  db.query(query, [temperature, humidity, smoke, speed], (err, result) => {
    if (err) {
      console.error('数据插入失败:', err);
      return res.status(500).json({ message: '插入数据失败' });
    }

    // 插入成功后推送数据给前端
    const newData = { temperature, humidity, smoke, speed };
    notifyFrontend(newData);  // 这里推送新数据

    res.status(200).json({
      message: '数据插入成功',
      data: { temperature, humidity, smoke, speed }
    });
  });
});
// 添加一个新的 POST API 路由，用于清空数据库中的数据
app.post('/api/car/clear', (req, res) => {
  const query = 'DELETE FROM car';  // 清空 car 表中的所有记录

  db.query(query, (err, result) => {
    if (err) {
      console.error('清空数据失败:', err);
      return res.status(500).json({ message: '清空数据失败' });
    }

    res.status(200).json({
      message: '数据库中的数据已成功清空'
    });
  });
});
// 启动Express服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口 ${PORT}`);
});

