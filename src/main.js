import Vue from "vue";
import App from "./App.vue";

Vue.config.productionTip = false;

/*
new Vue({
  render: h => h(App)
}).$mount("#app");
*/

// create div element
const div = document.createElement("div");
div.innerHTML = '<div id="xterm">';

// append it to <div id="app">
document.getElementById("app").appendChild(div);

new Vue({
  render: h => h(App)
}).$mount(div);
