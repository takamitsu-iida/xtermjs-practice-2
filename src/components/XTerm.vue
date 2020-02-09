<template>
  <div id="XTerm" ref="XTerm" v-bind:style="styleObject">
    <div id="header">
      <span><a href="#" v-on:click.stop.prevent="close">x</a></span>
      <span>( {{ width }} , {{ height }} )</span>
      <span id="error_message" ref="error_message" v-if="error_message">{{ error_message }}</span>
    </div>
    <div id="terminal-container" ref="container"></div>
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
    vm.error_message = "SSH ERROR: " + err;
  });

  socket.on("ssh-closed", function(data) {
    vm.$destroy();
  });

  socket.on("connect", function() {
    vm.error_message = "";
  });

  socket.on("disconnect", function(err) {
    vm.error_message = "WEBSOCKET DISCONNECTED: " + err;
    // socket.io.reconnection(false);
  });

  socket.on("error", function(err) {
    vm.error_message = "ERROR: " + err;
  });

  return socket;
}

export default {
  name: "XTerm",
  props: {
    termWidth: {
      type: Number,
      default: 800
    },
    termHeight: {
      type: Number,
      default: 600
    },
    host: {
      type: String,
      default: "localhost"
    }
  },
  data: function() {
    return {
      userid: null,
      error_message: "WEBSOCKET DISCONNECTED"
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
    const term = new Terminal(props.xterm);
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
    // socket.emit("request-connect", {host: "csr1000v"});

    this.userid = generateUuid();
    socket.emit("join", {room: "localhost", name: "iida", userid: this.userid});

    term.focus();
  },
  beforeDestroy() {
    try {
      this.socket.close();
    } catch (e) {
      console.log(e);
    }
    this.terminal.dispose();
    if (this.$refs.XTerm.parentNode) {  // hot reload might remove element automatically
      this.$refs.XTerm.parentNode.removeChild(this.$refs.XTerm);
    }
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
      }, 10);
    },
    close() {
      this.$destroy();
    }
  }
};
</script>

<style scoped>
* {
  box-sizing: border-box;
}

#XTerm {
  position: relative;
  padding-top: 24px; /* for #header */
  border: 0px;
  margin-top: 10px;
}

#header {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 24px;
  line-height: 24px;
  padding: 0 0 0 10px;
  color: rgb(240, 240, 240);
  background-color: gray;
  border-color: white;
  border-style: none none solid none;
  border-width: 1px;
  z-index: 99;
}
#header a {
  position: absolute;
  right: 0;
  top: 0;
  width: 24px;
  height: 24px;
  line-height: 24px;
  padding: 0;
  margin: 0;
  border-color: white;
  border-style: none none solid none;
  border-width: 1px;
  background-color:#f00;
  color: #fff;
  text-align: center;
  display: inline-block;
  /* border-radius: 0%; */
  text-decoration: none;
  z-index: 100;
}
#header a:hover {
  text-decoration: none;
}

#error_message {
  background-color: red;
  color: white;
}

#terminal-container {
  width: 100%;
  height: 100%;
  /* height: calc(100% - 20px - 20px); */
  margin: 0 auto;
}
</style>
