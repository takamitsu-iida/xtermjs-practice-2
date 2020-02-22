import Vue from "vue";

Vue.config.productionTip = true;  // false in production environemt

// npm i typeface-roboto
import "typeface-roboto/index.css";

// npm i material-design-icons
import "material-design-icons/iconfont/material-icons.css";

import vuetify from "./plugins/vuetify";

import Main from "./Main.vue";

new Vue({
  vuetify,
  render: h => h(Main)
}).$mount("#app");
