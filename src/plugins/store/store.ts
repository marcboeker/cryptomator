import Vue from 'vue';
import Vuex from 'vuex';
import Browser from './modules/browser';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    vault: '',
  },
  modules: {
    Browser,
  },
});
