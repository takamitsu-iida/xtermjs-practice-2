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

`npm run serve` でクライアント側を起動する。

`node server.js` でサーバを起動する。

## モジュールを入れ直す

コンパイルで`code ELIFECYCLE`エラーが出るときはモジュールを入れ直す。

```bash
rm -rf node_modules
rm package-lock.json yarn.lock
npm cache clear --force
npm install
```

それでもダメなら、開発系ツールを最新にする。

```bash
npm install -D webpack@latest
npm install -D webpack-cli@latest
npm install -D webpack-dev-server@latest
```

## イベントを契機に動的にVueインスタンスを作る

ボタンを押したら<div>を動的に作って、そこにVueのインスタンスをマウントするだけなのだが、ハマりどころがあるので注意したい。

子コンポーネントとの間でデータのやり取りがない場合は簡単。
ボタンのイベントで以下のようなopen関数を呼べばいい。

```js
export default {
  name: "MainApp",
  components: {
    XTerm: XTerm
  },
  methods: {
    open: function(event) {
      // create new div element
      const div = document.createElement("div");
      this.$refs.xterm.appendChild(div);

      new Vue({
        render: h => h(XTerm)
      }).$mount(div);
    }
  }
};
```

親子関係でデータのやり取りが発生する場合は少々ややこしい。
初期値としてpropsにデータを渡したくなるので、このパターンを使いたくなるのだが・・・

```js
export default {
  name: "MainApp",
  components: {
    XTerm: XTerm
  },
  methods: {
    open: function(event) {
      this.count += 1;

      // create new div element
      const div = document.createElement("div");
      div.id = "xterm-" + this.count;
      this.$refs.xterm.appendChild(div);

      // if you got,
      //   [Vue warn]: You are using the runtime-only build of Vue where the template compiler is not available.
      // then additional config is needed in vue.config.js
      new Vue({
        components: {
          XTerm: XTerm
        },
        template: `
          <XTerm
            v-bind:termWidth="width"
            v-bind:termHeight="height"
            v-on:destroy="destroy"
          ></XTerm>
        `,
        data: function() {
          return {
            width: 640,
            height: 480,
          }
        },
        methods: {
          destroy: function() {
            console.log("destroied");
          }
        }
      }).$mount(div);
    }
  }
};
```

これだけだと動かない。
動的に生成するVueインスタンスでtemplateを書いてしまうと、コンパイル処理で失敗してしまう。
対策として`vue.config.js`に以下の設定を加える。

`vue.config.js`

```js
module.exports = {
  devServer: {
    port: 8080,
    disableHostCheck: true,
  },
  configureWebpack: {
    resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      }
    }
  },
};
```

詳細は、完全ビルドとランタイム限定ビルド、でマニュアルを調べると出てくる。

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
