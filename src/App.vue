<template>
  <v-app>

    <v-app-bar app color="primary" dark>

      <div class="d-flex align-center">
        <v-img
          alt="Vuetify Logo"
          class="shrink mr-2"
          contain
          src="terminal.ico"
          transition="scale-transition"
          width="40"
        />
      </div>

      <v-spacer></v-spacer>

      <v-btn
        href="https://github.com/takamitsu-iida/xtermjs-practice-2"
        target="_blank"
        text
      >
        <span class="mr-2">src</span>
        <v-icon>mdi-open-in-new</v-icon>
      </v-btn>

    </v-app-bar>

    <v-content>
      <div id="App">

        <Status></Status>
        <button v-on:click.prevent="open">Open</button>
        <br />

        <select v-model="host">
          <option disabled value="">Please select</option>
          <option v-for="(host, index) in hosts" v-bind:key="index" v-bind:value="host">
            {{ host }}
          </option>
        </select>
        <span>Selected: {{ host }}</span>
        <br />

        <input v-model.number="width" type="number" />
        <input v-model.number="height" type="number" />
        parent parameter {{ width }} , {{ height }}

        <div ref="xterm"></div>
        <!--
        <XTerm
          v-bind:termWidth="width"
          v-bind:termHeight="height"
        ></XTerm>
        -->
      </div>
    </v-content>

  </v-app>

</template>

<script>
import Vue from "vue";
import Status from "./components/Status.vue";
import XTerm from "./components/XTerm.vue";

export default {
  name: "MainApp",
  components: {
    XTerm: XTerm,
    Status: Status
  },
  data: function() {
    return {
      width: 800,
      height: 600,
      host: "localhost",
      hosts: ["localhost", "azure", "csr1000v"],
      roomUsers: []
    };
  },
  methods: {
    onDestroy: function() {
      console.log("destroied");
    },
    open: function(event) {
      const div = document.createElement("div");
      this.$refs.xterm.appendChild(div);
      const self = this;
      new Vue({
        // render: h => h(XTerm),
        // h is createElement function
        // see, https://jp.vuejs.org/v2/guide/render-function.html#createElement-%E5%BC%95%E6%95%B0
        render: function(createElement) {
          return createElement(XTerm, {
            props: {
              termWidth: self.width,
              termHeight: self.height,
              host: self.host
            },
            on: {
              destroy: self.onDestroy
            }
          });
        }
      }).$mount(div);
      event.target.blur();  // unfocus to avoid duplicate open by return key
    }
  }
};
</script>

<style>
#App {
  font-size: 0.9em;
  font-family: Menlo, Monaco, 'Courier New', monospace, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
</style>
