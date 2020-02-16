import Vue from "vue";

Vue.config.productionTip = true;  // false in production environemt

// element-ui is not used
//
// import ElementUI from "element-ui"
// import locale from "element-ui/lib/locale/lang/ja.js"
// import "element-ui/lib/theme-chalk/index.css"
// Vue.use(ElementUI, {locale})

import App from "./App.vue";

new Vue({
  render: h => h(App)
}).$mount("#app");
