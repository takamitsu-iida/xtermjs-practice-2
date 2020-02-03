/* eslint-disable prettier/prettier */
'use strict';

// see chat room
// https://qiita.com/ynunokawa/items/564757fe6dbe43d172f8

const express = require('express');
const app = express();

const http = require('http');
const server = http.createServer(app);

const fs = require('fs');
const path = require('path');

// config.json is not included in git repository.
//   1. copy config.sample.json config.json
//   2. edit it
const nodeRoot = path.dirname(require.main.filename);
const configPath = path.join(nodeRoot, 'config.json');
let config = null;
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('ERROR:\n\n  ' + err);
  }
} else {
  console.error('ERROR: ' + configPath + ' not found');
}
if (config === null) {
  process.exit(1);
}

const SshClient = require('ssh2').Client;

const utf8 = require('utf8');

// set the template engine ejs
app.set('view engine', 'ejs');

// set ./dist as a static contents root
app.use(express.static('dist'));

// routes
app.get('/a', (req, res) => {
  res.render('index');
});

// http server
const serverPort = 8888;
server.listen(serverPort);

// socket.io server
const io = require('socket.io')(server, {pingTimeout: 30000});

// number of current connected users
let numUsers = 0;

io.on('connection', function(socket) {
  ++numUsers;
  console.log('current users: ' + numUsers);

  const ssh = new SshClient();
  let sshConnected = false;
  ssh
    .on('ready', function() {
      sshConnected = true;
      socket.emit('data', '\r\n*** SSH CONNECTION ESTABLISHED ***\r\n');
      ssh.shell(function(err, stream) {
        if (err) {
          socket.emit('data', '\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
          ssh.end();
          return;
        }

        // stream.setEncoding('utf-8');

        // From Browser->Backend, send to ssh stream
        socket.on('data', function(data) {
          if (sshConnected) {
            stream.write(data);
          }
        });

        // handle browser resize event
        socket.on('resize', function(data) {
          stream.setWindow(data.rows, data.cols);
        });

        // request initial screen size
        socket.emit('request-resize');

        // From Backend->Browser
        stream.on('data', function(d) {
          // socket.emit('data', utf8.decode(d.toString('binary')));
          // socket.broadcast.emit('data', utf8.decode(d.toString('binary')));
          try {
            let data = utf8.decode(d.toString('binary'));
            const room = socket.usrobj.room;
            if (room) {
              if (data) {
                io.sockets.in(room).emit('data', data);
              }
            }
          } catch (e) {
            console.log(e);
          }
        });

        stream.on('close', function() {
          socket.emit('data', '\r\n*** SSH SHELL CLOSED ***\r\n');
          ssh.end();
          sshConnected = false;
          console.log('ssh stream closed');
        });
      });
    });

  ssh
    .on('close', function() {
      socket.emit('data', '\r\n*** SSH CONNECTION CLOSED ***\r\n');
      socket.emit('ssh-closed');
      sshConnected = false;
    });

  ssh
    .on('error', function(err) {
      console.log(err);
      socket.emit('data', '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
      socket.emit('ssh-error', err);
      sshConnected = false;
    });

  socket
    .on('request-connect', function(data) {
      const host = data.host;
      const param = config[host];
      // console.log(param);
      if (param == null) {
        return;
      }

      if (param.password != null) {
        ssh.connect({
          keepaliveInterval: 20000,
          host: param.host,
          port: param.port,
          username: param.username,
          password: param.password,
        });
      } else if (param.privatekey != null) {
        ssh.connect({
          keepaliveInterval: 20000,
          host: param.host,
          port: param.port,
          username: param.username,
          privateKey: fs.readFileSync(param.privatekey),
        });
      } else {
        socket.emit('data', '\r\n*** AUTHENTICATION INFORMATION IS MISSING ***\r\n');
      }
    });

  // user send 'join' message with json object
  // store the object in socket object
  socket
    .on('join', function(data) {
      const usrobj = {
        'room': data.room,
        'name': data.name,
      };
      socket.usrobj = usrobj;
      socket.join(data.room);
      console.log('name: ' + data.name + ' join to the room: ' + data.room);
    });

  socket
    .on('disconnect', function(reason) {
      console.log('user disconnected because: ' + reason);
      --numUsers;
      console.log('current users: ' + numUsers);
    });
});
