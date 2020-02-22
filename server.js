"use strict";

const SshClient = require("ssh2").Client;
const Telnet = require("telnet-client")
const utf8 = require("utf8");

const fs = require("fs");
const path = require("path");

const express = require("express");
const http = require("http");

require('date-utils');

// By default, a maximum of 10 listeners can be registered for any single event.
require('events').EventEmitter.defaultMaxListeners = 20;

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

// express server
const app = express();

// set the template engine as ejs
app.set("view engine", "ejs");

// set ./dist as a static contents root
app.use(express.static("dist"));

// routes (for test purpose)
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
  // broadcast roomUsers object to control room
  io.sockets.in("control").emit("roomUsers", roomUsers);
};

function createSshClient(socket) {
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
      socket.log = "";
      stream.on("data", function(d) {
        // socket.emit('data', utf8.decode(d.toString('binary')));
        // socket.broadcast.emit('data', utf8.decode(d.toString('binary')));
        try {
          const data = utf8.decode(d.toString("binary"));
          const room = socket.usrobj.room;
          if (room && data) {
            io.sockets.in(room).emit("data", data);
            socket.log += data;
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
    socket.emit("backend-closed");
    sshConnected = false;

    // save log
    const date = new Date().toFormat("YYYYMMDD-HH24MISS");
    const filename = socket.usrobj.name + "_" + date + ".log";
    const path = "log/" + filename;
    fs.writeFileSync(path, socket.log);
    delete socket.log;
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

  return ssh;
}


function createTelnetClient(socket) {
  var telnet = new Telnet()

  telnet.on("connect", function() {
    console.log("telnet connect");

    // From Browser->Backend, send to telnet stream
    socket.on("data", function(data) {
      telnet.send(data, {}, function(err) {});
    });

  });

  // From Backend->Browser
  telnet.on("data", function(d) {
    try {
      const data = utf8.decode(d.toString("binary"));
      const room = socket.usrobj.room;
      if (room && data) {
        io.sockets.in(room).emit("data", data);
      }
    } catch (e) {
      console.log(e);
    }
  });

  telnet.on("timeout", function() {
    console.log("telnet timeout")
    // telnet.end()
  });

  telnet.on("close", function() {
    console.log("telnet closed")
    socket.emit("data", "\r\n*** TELNET CONNECTION CLOSED ***\r\n");
    socket.emit("backend-closed");
  });

  return telnet;
}

io.on("connection", function(socket) {
  console.log("new socket.io connection created");

  socket.on("request-connect", function(data) {

    const TEST_TELNET = false;
    if (TEST_TELNET) {
      const telnet = createTelnetClient(socket);
      var params = {
        host: "localhost", // "10.35.185.2",
        port: 23,
        negotiationMandatory: true,
        ors: "",
        // timeout in msec
        // Sets the socket to timeout after the specified number of milliseconds.
        // of inactivity on the socket.
        timeout: 0
      }
      telnet.connect(params);
      return;
    }

    const host = data.host;
    const hostParam = config[host];
    // console.log(hostParam);
    if (hostParam == null) {
      socket.emit(
        "data",
        "\r\n*** CONFIG.JSON IS MISSING ***\r\n"
      );
      return;
    }
    const param = {
      keepaliveInterval: 20000,
      host: hostParam.host,
      port: hostParam.port,
      username: hostParam.username,
      password: hostParam.password,
    }
    if (hostParam.privatekey) {
      try {
        param["privateKey"] = fs.readFileSync(hostParam.privatekey);
      } catch(err) {
        console.log(err);
      }
    }

    if (!("password in param") && !("privateKey" in param)) {
      socket.emit(
        "data",
        "\r\n*** AUTHENTICATION INFORMATION IS MISSING ***\r\n"
      );
    } else {
      const ssh = createSshClient(socket);
      ssh.connect(param);
    }
  });

  // user send 'join' message with usrobj
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


const events = require("events");
const Promise = require("bluebird");

class Macro extends events.EventEmitter {
  constructor() {
    super();

    this.shellPrompt = "/(?:\/ )?#\s/";
    this.passwordPrompt = "/Password[: ]*$/i";
    this.execTimeout = 2000;
    this.sendTimeout = 2000;

  }

  exec(cmd, opts, callback) {
    if (opts && opts instanceof Function) {
      callback = opts;
    }
    return new Promise((resolve, reject) => {


    }).asCallback(callback);
  }

}

function search(str, pattern) {
  if (pattern instanceof RegExp) {
    return str.search(pattern);
  }
  return str.indexOf(pattern);
}
