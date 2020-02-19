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

## vuetifyのインストール

見た目をきれいにするために`vuetify`を使う。
プロジェクトのディレクトリで `vue add vuetify` コマンドを実行する。

App.vueとmain.jsは入れ替えられてしまうので要注意。

```bash
iida-macbook-pro:xtermjs-practice-2 iida$ vue add vuetify

📦  Installing vue-cli-plugin-vuetify...

+ vue-cli-plugin-vuetify@2.0.5
added 4 packages from 4 contributors and audited 28273 packages in 7.271s

35 packages are looking for funding
  run `npm fund` for details

found 6 low severity vulnerabilities
  run `npm audit fix` to fix them, or `npm audit` for details
✔  Successfully installed plugin: vue-cli-plugin-vuetify

? Choose a preset: Default (recommended)

🚀  Invoking generator for vue-cli-plugin-vuetify...
📦  Installing additional dependencies...

added 7 packages from 5 contributors and audited 30453 packages in 10.327s

37 packages are looking for funding
  run `npm fund` for details

found 6 low severity vulnerabilities
  run `npm audit fix` to fix them, or `npm audit` for details
⚓  Running completion hooks...

✔  Successfully invoked generator for plugin: vue-cli-plugin-vuetify
   The following files have been updated / added:

     src/assets/logo.svg
     src/components/HelloWorld.vue
     src/plugins/vuetify.js
     package-lock.json
     package.json
     public/index.html
     src/App.vue
     src/main.js
     vue.config.js

   You should review these changes with git diff and commit them.

 vuetify  Discord community: https://community.vuetifyjs.com
 vuetify  Github: https://github.com/vuetifyjs/vuetify
 vuetify  Support Vuetify: https://github.com/sponsors/johnleider
```

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

ボタンを押したら`<div>`を動的に作って、そこにVueのインスタンスをマウントするだけなのだが、ハマりどころがあるので注意したい。

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
詳細は、完全ビルドとランタイム限定ビルド、でマニュアルを調べると出てくる。

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

最終的には`renderElement()`を呼び出す方法に落ち着いた。これならvue.config.jsの変更は不要。

よく見る `h => h(XTerm)` のhはrenderEement関数なので、その第２引数としてデータを渡す。
渡せるのは以下の通り。

|オプション |概要 |
|---|---|
|attrs |属性  |
|class |class属性 |
|style |style属性 |
|props |コンポーネントのプロパティ、props down |
|domProps |DOMプロパティ |
|on |イベントハンドラ、event up |
|nativeOn |イベントハンドラ（ブラウザネイティブイベント） |

```js
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
```

呼び出す側のインスタンス`this`を`self`という名前で置き換えて、子コンポーネントから参照している。

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
