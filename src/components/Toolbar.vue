<template>
  <v-toolbar flat dense color="blue-grey lighten-5">
    <confirm ref="confirm"></confirm>
    <v-toolbar-title>Cryptomator</v-toolbar-title>
    <div class="flex-grow-1"></div>
    <template v-if="$vuetify.breakpoint.smAndUp">
      <div v-show="currentParentDirId !== null">
        <v-menu
          v-model="newDirectoryPopper"
          :close-on-content-click="false"
          :nudge-width="200"
          offset-y
        >
          <template v-slot:activator="{on}">
            <v-btn icon v-on="on" title="Create new Directory">
              <v-icon>mdi-folder-plus-outline</v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-text>
              <v-text-field label="Name" v-model="newDirectoryName" hide-details></v-text-field>
            </v-card-text>
            <v-card-actions>
              <div class="flex-grow-1"></div>
              <v-btn @click="newDirectoryPopper = false" depressed>Cancel</v-btn>
              <v-btn color="success" :disabled="!newDirectoryName" depressed @click="newDir"
                >Create Directory</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-btn icon @click="uploadFiles" title="Upload Files">
          <v-icon>mdi-upload</v-icon>
        </v-btn>
        <v-btn icon @click.stop="reload" title="Refresh current Directory">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn icon @click.stop="removeDirectory" title="Remove current Directory">
          <v-icon>mdi-delete-outline</v-icon>
        </v-btn>
      </div>
    </template>
  </v-toolbar>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {Item, ItemType} from './Item';
import Confirm from './Confirm.vue';
import {namespace} from 'vuex-class';
const browser = namespace('Browser');

@Component({
  components: {
    Confirm,
  },
})
export default class Toolbar extends Vue {
  private newDirectoryPopper = false;
  private newDirectoryName = '';

  @browser.State
  public currentParentDirId!: string;

  @browser.State
  public currentItem!: Item;

  @browser.Action
  public remove!: (item: Item) => Promise<void>;

  @browser.Action
  public createDirectory!: (name: string) => Promise<void>;

  @browser.Action
  public upload!: (files: any) => Promise<void>;

  @browser.Action
  public reload!: () => Promise<void>;

  private async uploadFiles(): Promise<void> {
    const files = await (window as any).showOpenFilePicker();
    await this.upload(files);
    await this.reload();
  }

  private async newDir(): Promise<void> {
    this.newDirectoryPopper = false;
    await this.createDirectory(this.newDirectoryName);
    await this.reload();
    this.newDirectoryName = '';
  }

  private async removeDirectory(): Promise<void> {
    let confirmed = await (this.$refs.confirm as any).open(
      'Delete',
      `Are you sure you want to delete this ${
        this.currentItem.Type === ItemType.Directory ? 'directory' : 'file'
      }?<br><em>${this.currentItem.Name}</em>`
    );

    if (confirmed) {
      await this.remove(this.currentItem);
      await this.reload();
    }
  }
}
</script>
