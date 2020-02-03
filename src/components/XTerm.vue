/* eslint-disable no-unused-vars */
<template>
  <div class="box" v-bind:style="styleObject" ref="box">
    <div id="header">header:</div>
    <div id="terminal-container" ref="container"></div>
    <div id="bottomdiv">
      <div id="status" ref="status">status: ( {{ width }} , {{ height }} )</div>
    </div>
  </div>
</template>

<script>
require("xterm/css/xterm.css");

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import io from "socket.io-client";

const MIN_WIDTH = 640;
const MAX_WIDTH = 2048;
const MIN_HEIGHT = 480;
const MAX_HEIGHT = 1024;

function createSocket(vm) {
  const term = vm.terminal;

  // connect backend websocket
  const socket = io.connect(null, {
    // transports: ['websocket'],
    // allowUpgrades: false,
    pingTimeout: 30000
  });

  // Browser -> Backend
  term.onData(function(data) {
    socket.emit("data", data);
  });

  // Backend -> Browser
  socket.on("data", function(data) {
    term.write(data);
  });

  socket.on("request-resize", function() {
    socket.emit("resize", {cols: term.cols, rows: term.rows});
  });

  socket.on("ssh-error", function(err) {
    console.log(err);
    const status_element = vm.$refs.status;
    if (status_element) {
      status_element.style.backgroundColor = "red";
      status_element.innerHTML = "SSH ERROR";
    }
  });

  socket.on("ssh-closed", function(data) {
    vm.$destroy();
  });

  socket.on("disconnect", function(err) {
    const status_element = vm.$refs.status;
    if (status_element) {
      status_element.style.backgroundColor = "red";
      status_element.innerHTML = "WEBSOCKET SERVER DISCONNECTED: " + err;
    }
    // socket.io.reconnection(false);
  });

  socket.on("error", function(err) {
    const status_element = vm.$refs.status;
    if (status_element) {
      status_element.style.backgroundColor = "red";
      status_element.innerHTML = "ERROR: " + err;
    }
  });

  return socket;
}

function generateUuid() {
  // https://github.com/GoogleChrome/chrome-platform-analytics/blob/master/src/internal/identifier.js
  // const FORMAT: string = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.split('');
  for (let i = 0, len = chars.length; i < len; i++) {
    switch (chars[i]) {
    case 'x':
      chars[i] = Math.floor(Math.random() * 16).toString(16);
      break;
    case 'y':
      chars[i] = (Math.floor(Math.random() * 4) + 8).toString(16);
      break;
    }
  }
  return chars.join('');
}

export default {
  name: "XTerm",
  props: {
    termWidth: {
      type: Number,
      default: 640
    },
    termHeight: {
      type: Number,
      default: 480
    }
  },
  computed: {
    width: function() {
      if (this.termWidth < MIN_WIDTH) {
        return MIN_WIDTH;
      }
      if (this.termWidth > MAX_WIDTH) {
        return MAX_WIDTH;
      }
      return this.termWidth;
    },
    height: function() {
      if (this.termHeight < MIN_HEIGHT) {
        return MIN_HEIGHT;
      }
      if (this.termHeight > MAX_HEIGHT) {
        return MAX_HEIGHT;
      }
      return this.termHeight;
    },
    styleObject: function() {
      return {
        width: this.width + "px",
        height: this.height + "px"
      };
    }
  },
  watch: {
    width: function() {
      this.fit();
    },
    height: function() {
      this.fit();
    }
  },
  mounted: function() {
    const term = new Terminal();
    term.open(this.$refs.container);
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitAddon.fit();
    term.focus();
    this.terminal = term;
    this.fitAddon = fitAddon;
    this.fit();

    const socket = createSocket(this);
    socket.emit("request-connect", {host: "localhost"});
    socket.emit("join", {room: "localhost", name: "iida", userid: generateUuid()});
    this.socket = socket;
  },
  beforeDestroy() {
    this.terminal.dispose();
    this.$refs.box.parentNode.removeChild(this.$refs.box);
    this.$emit("destroy");
  },
  methods: {
    fit() {
      const term = this.terminal;
      const fitAddon = this.fitAddon;
      const socket = this.socket;
      term.element.style.display = "none";
      setTimeout(function() {
        fitAddon.fit();
        term.element.style.display = "";
        term.refresh(0, term.rows - 1);
        if (socket) {
          socket.emit("resize", {cols: term.cols, rows: term.rows});
        }
      }, 0);
    }
  }
};
</script>

<style scoped>
.box {
  display: block;
  height: 600 px;
  position: relative;
}

#header {
  display: block;
  color: rgb(240, 240, 240);
  background-color: rgb(0, 128, 0);
  width: 100%;
  border-color: white;
  border-style: none none solid none;
  border-width: 1px;
  z-index: 99;
  height: 20px;
}

#terminal-container {
  display: block;
  width: 100%;
  height: calc(100% - 40px);
  margin: 0 auto;
}

#bottomdiv {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 20 px;
  background-color: rgb(50, 50, 50);
  border-color: white;
  border-style: solid none none none;
  border-width: 1px;
  z-index: 99;
}

#status {
  display: block;
  height: 100%;
  color: rgb(240, 240, 240);
  background-color: rgb(50, 50, 50);
  border-color: white;
  text-align: left;
  z-index: 100;
}
</style>
