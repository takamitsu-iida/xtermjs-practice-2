<template>
  <div id="XTerm" ref="XTerm" v-bind:style="styleObject">
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

import generateUuid from './uuid.js';
import props from './props'

const MIN_WIDTH = 640;
const MAX_WIDTH = 2048;
const MIN_HEIGHT = 480;
const MAX_HEIGHT = 1024;

const WEBSOCKET_URL = props.WEBSOCKET_URL;

function createSocket(vm) {
  const term = vm.terminal;

  // connect backend websocket
  const socket = io.connect(WEBSOCKET_URL, {
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
    socket.close();
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
    },
    host: {
      type: String,
      default: "localhost"
    }
  },
  data: function() {
    return {
      userid: null
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
    console.log(this.host);
    console.log(this.termWidth);
    console.log(this.termHeight);

    const term = new Terminal();
    this.terminal = term;
    term.open(this.$refs.container);
    const fitAddon = new FitAddon();
    this.fitAddon = fitAddon;
    term.loadAddon(fitAddon);
    fitAddon.fit();
    this.fit();

    const socket = createSocket(this);
    this.socket = socket;

    // this is a test
    socket.emit("request-connect", {host: "localhost"});

    this.userid = generateUuid();
    socket.emit("join", {room: "localhost", name: "iida", userid: this.userid});

    term.focus();
  },
  beforeDestroy() {
    this.terminal.dispose();
    this.$refs.XTerm.parentNode.removeChild(this.$refs.XTerm);
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
#XTerm {
  position: relative;
  box-sizing: border-box;
  padding-top: 20px;    /* for #header */
  padding-bottom: 20px; /* for #bottomdiv */
  border: 0px;
  margin-top: 10px;
}

#header {
  position: absolute;
  box-sizing: border-box;
  left: 0;
  top: 0;
  color: rgb(240, 240, 240);
  background-color: rgb(0, 128, 0);
  width: 100%;
  height: 20px;
  border-color: white;
  border-style: none none solid none;
  border-width: 1px;
  z-index: 99;
}

#terminal-container {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  /* height: calc(100% - 20px - 20px); */
  margin: 0 auto;
}

#bottomdiv {
  position: absolute;
  box-sizing: border-box;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 20px;
  border: 0px;
  padding: 0px;
  background-color: rgb(50, 50, 50);
  z-index: 99;
}

#status {
  width: 100%;
  height: 100%;
  color: rgb(240, 240, 240);
  background-color: rgb(50, 50, 50);
  text-align: left;
  border-color: white;
  border-style: solid none none none;
  border-width: 1px;
  z-index: 100;
}
</style>
