import Vue from "vue";

Vue.config.productionTip = true;  // false in production environemt

import vuetify from './plugins/vuetify';

import App from "./App.vue";

new Vue({
  vuetify,
  render: h => h(App)
}).$mount("#app");
