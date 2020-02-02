/* eslint-disable no-unused-vars */
<template>
  <div class="box" v-bind:style="styleObject">
    <div id="header">header:</div>
    <div id="terminal-container" ref="container"></div>
    <div id="bottomdiv">
      <div id="status">status: ( {{ width }} , {{ height }} )</div>
    </div>
  </div>
</template>

<script>
require("xterm/css/xterm.css");

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";

const MIN_WIDTH = 640;
const MAX_WIDTH = 2048;
const MIN_HEIGHT = 480;
const MAX_HEIGHT = 1024;

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
  },
  beforeDestroy() {
    this.terminal.destroy();
  },
  methods: {
    fit() {
      const term = this.terminal;
      const fitAddon = this.fitAddon;
      term.element.style.display = "none";
      setTimeout(function() {
        fitAddon.fit();
        term.element.style.display = "";
        term.refresh(0, term.rows - 1);
      }, 100);
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
  height: calc(100% - 20px);
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
  height: 20 px;
  color: rgb(240, 240, 240);
  background-color: rgb(50, 50, 50);
  border-color: white;
  text-align: left;
  z-index: 100;
}
</style>
