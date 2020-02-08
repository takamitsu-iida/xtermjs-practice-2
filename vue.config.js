module.exports = {
  devServer: {
    host: 'localhost',
    port: 8080,
    disableHostCheck: true,
  },

  // if you got
  //   [Vue warn]: You are using the runtime-only build of Vue where the template compiler is not available.
  // then following config is needed
  /*
  configureWebpack: {
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    }
  },
  */
};
