# xtermjs-practice-2

制限事項：macに対してssh接続した場合、日本語の入力ができない。文字コードが違うため。Linuxなら大丈夫。回避方法不明。

最初に `vue create xtermjs-practice-2` でvue.jsを使える状態にする。

サーバ側はexpressを使いたいので`npm install`で必要なモジュール類を加えていく。

```bash
npm install express
npm install socket.io
npm install socket.io-client
npm install ssh2
npm install utf8
```

サーバのスクリプトは`server.js`をルートディレクトリに配備する。

`npm run build` でクライアント側をコンパイルする。

`node server.js` でサーバを起動する。

このやり方はイマイチなので、もう少しスマートな方法を模索したい。

## eslint

<https://github.com/google/eslint-config-google>

```bash
npm install --save-dev eslint eslint-config-google
```

`.eslintrc.js`

```js
module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ["google", "plugin:vue/essential", "@vue/prettier"],
```

## Project setup

```bash
npm install
```

### Compiles and hot-reloads for development

```bash
npm run serve
```

### Compiles and minifies for production

```bash
npm run build
```

### Lints and fixes files

```bash
npm run lint
```

### Customize configuration

See [Configuration Reference](https://cli.vuejs.org/config/).
