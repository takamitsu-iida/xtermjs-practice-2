<template>
  <div>
    <input v-model.number="width" type="number" />
    <input v-model.number="height" type="number" />
    parent parameter {{ width }} , {{ height }}
    <XTerm
      v-bind:termWidth="width"
      v-bind:termHeight="height"
      v-on:destroy="destroy"
    ></XTerm>
  </div>
</template>

<script>
import XTerm from "./components/XTerm.vue";

export default {
  // name: "app",
  components: {
    XTerm: XTerm
  },
  data: function() {
    return {
      width: 640,
      height: 480
    };
  },
  methods: {
    destroy: function() {
      this.$el.parentNode.removeChild(this.$el);
    }
  }
};
</script>

<style>
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  /* text-align: center; */
  color: #2c3e50;
  margin-top: 10px;
}
</style>
