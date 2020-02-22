module.exports = {
  "devServer": {
    "host": "localhost",
    "port": 8080,
    "disableHostCheck": true
  },
  "configureWebpack": {
    "performance": {
      "hints": false
    }
  },
  "transpileDependencies": [
    "vuetify"
  ]
}
