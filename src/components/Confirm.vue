<template>
  <v-dialog v-model="dialog" max-width="400" @keydown.esc="cancel">
    <v-card>
      <v-toolbar dark color="red" dense flat>
        <v-toolbar-title class="white--text">{{ title }}</v-toolbar-title>
      </v-toolbar>
      <v-card-text v-if="message" class="pa-4 text-center" v-html="message"></v-card-text>
      <v-card-actions class="pt-0">
        <v-spacer></v-spacer>
        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn depressed color="red" @click="agree">Yes</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
/**
 * Vuetify Confirm Dialog component
 * https://gist.github.com/eolant/ba0f8a5c9135d1a146e1db575276177d
 *
 * Insert component where you want to use it:
 * <confirm ref="confirm"></confirm>
 *
 * Call it:
 * this.$refs.confirm.open('Delete', 'Are you sure?', { color: 'red' }).then((confirm) => {})
 * Or use await:
 * if (await this.$refs.confirm.open('Delete', 'Are you sure?', { color: 'red' })) {
 *   // yes
 * }
 * else {
 *   // cancel
 * }
 */
import {Component, Vue} from 'vue-property-decorator';

@Component
export default class Confirm extends Vue {
  private dialog = false;
  private resolve = null;
  private reject = null;
  private message = null;
  private title = null;

  public open(title: string, message: string): Promise<void> {
    this.dialog = true;
    this.title = title;
    this.message = message;
    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  public agree(): void {
    this.resolve(true);
    this.dialog = false;
  }

  public cancel(): void {
    this.resolve(false);
    this.dialog = false;
  }
}
</script>
