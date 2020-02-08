"use strict";

const SshClient = require("ssh2").Client;
const utf8 = require("utf8");

const fs = require("fs");
const path = require("path");

const express = require("express");
const http = require("http");

// config.json is not included in git repository.
//   1. copy config.sample.json config.json
//   2. edit it
const nodeRoot = path.dirname(require.main.filename);
const configPath = path.join(nodeRoot, "config.json");
let config = null;
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (err) {
    console.error("ERROR:\n\n  " + err);
  }
} else {
  console.error("ERROR: " + configPath + " not found");
}
if (config === null) {
  process.exit(1);
}

const app = express();

// set the template engine ejs
app.set("view engine", "ejs");

// set ./dist as a static contents root
app.use(express.static("dist"));

// routes
app.get("/a", (req, res) => {
  res.render("index");
});

// http server
const server = http.createServer(app);
const serverPort = 8888;
server.listen(serverPort);

// socket.io server
const io = require("socket.io")(server, { pingTimeout: 30000 });

// CORS
// see https://socket.io/docs/server-api/
io.origins((origin, callback) => {
  // if (origin !== 'http://localhost:8888/') {
  //   return callback('origin not allowed', false);
  // }
  callback(null, true);
});

// list of usrobj
let roomUsers = [];

function emitRoomUsers() {
  // broadcast to control room
  io.sockets.in("control").emit("roomUsers", roomUsers);
};

io.on("connection", function(socket) {
  console.log("new socket.io connection created");

  const ssh = new SshClient();
  let sshConnected = false;
  ssh.on("ready", function() {
    sshConnected = true;
    socket.emit("data", "\r\n*** SSH CONNECTION ESTABLISHED ***\r\n");
    ssh.shell(function(err, stream) {
      if (err) {
        socket.emit(
          "data",
          "\r\n*** SSH SHELL ERROR: " + err.message + " ***\r\n"
        );
        ssh.end();
        return;
      }

      // stream.setEncoding('utf-8');

      // From Browser->Backend, send to ssh stream
      socket.on("data", function(data) {
        if (sshConnected) {
          stream.write(data);
        }
      });

      // handle browser resize event
      socket.on("resize", function(data) {
        socket.usrobj["cols"] = data.cols;
        socket.usrobj["rows"] = data.rows;
        stream.setWindow(data.rows, data.cols);
        emitRoomUsers();
      });

      // request initial screen size
      socket.emit("request-resize");

      // From Backend->Browser
      stream.on("data", function(d) {
        // socket.emit('data', utf8.decode(d.toString('binary')));
        // socket.broadcast.emit('data', utf8.decode(d.toString('binary')));
        try {
          let data = utf8.decode(d.toString("binary"));
          const room = socket.usrobj.room;
          if (room) {
            if (data) {
              io.sockets.in(room).emit("data", data);
            }
          }
        } catch (e) {
          console.log(e);
        }
      });

      stream.on("close", function() {
        socket.emit("data", "\r\n*** SSH SHELL CLOSED ***\r\n");
        ssh.end();
        sshConnected = false;
        console.log("ssh stream closed");
      });
    });
  });

  ssh.on("close", function() {
    socket.emit("data", "\r\n*** SSH CONNECTION CLOSED ***\r\n");
    socket.emit("ssh-closed");
    sshConnected = false;
  });

  ssh.on("error", function(err) {
    console.log(err);
    socket.emit(
      "data",
      "\r\n*** SSH CONNECTION ERROR: " + err.message + " ***\r\n"
    );
    socket.emit("ssh-error", err);
    sshConnected = false;
  });

  socket.on("request-connect", function(data) {
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
        password: param.password
      });
    } else if (param.privatekey != null) {
      ssh.connect({
        keepaliveInterval: 20000,
        host: param.host,
        port: param.port,
        username: param.username,
        privateKey: fs.readFileSync(param.privatekey)
      });
    } else {
      socket.emit(
        "data",
        "\r\n*** AUTHENTICATION INFORMATION IS MISSING ***\r\n"
      );
    }
  });

  // user send 'join' message with json object usrobj
  // store the object in socket object
  // it is something like {room: "localhost", name: "iida", userid: "xxxxxxxx-xxxx-4xx"}
  socket.on("join", function(usrobj) {
    roomUsers.push(usrobj);
    socket.usrobj = usrobj;
    socket.join(usrobj.room);
    console.log("name: " + usrobj.name + " join to the room: " + usrobj.room);
    console.log("current users: " + roomUsers.length);
    emitRoomUsers();
  });

  socket.on("disconnect", function(reason) {
    console.log("user disconnected reason: " + reason);
    roomUsers = roomUsers.filter(obj => socket.usrobj && obj.userid !== socket.usrobj.userid);
    console.log("current users: " + roomUsers.length);
    emitRoomUsers();
  });
});
