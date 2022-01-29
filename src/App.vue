<template>
  <v-app>
    <v-main>
      <Browser />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import store from './plugins/store/store';
import Browser from './components/Browser.vue';

export default Vue.extend({
  name: 'App',
  store: store,
  components: {
    Browser,
  },
});
</script>
