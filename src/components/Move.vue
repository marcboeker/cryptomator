<template>
  <v-dialog v-model="dialog" max-width="400" @keydown.esc="cancel">
    <v-card>
      <v-toolbar dark color="blue" dense flat>
        <v-toolbar-title class="white--text">Move directory/file</v-toolbar-title>
      </v-toolbar>
      <v-card-text class="pa-4 text-center" v-if="item"
        >Wehere do you want to move <em>{{ item.Name }}</em> to?</v-card-text
      >
      <v-card-text class="pa-4 text-center"
        ><v-text-field label="New Name" v-model="name"
      /></v-card-text>
      <v-card-text class="pa-4 text-center"
        ><v-treeview
          :items="items"
          @update:active="selectDirectory"
          item-key="Id"
          item-text="Name"
          item-children="Children"
          :load-children="loadChildren"
          dense
          :return-object="true"
          activatable
          hoverable
      /></v-card-text>
      <v-card-actions class="pt-0">
        <v-spacer></v-spacer>
        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn depressed color="blue" :disabled="!canMove()" @click="agree">Move</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {Item, ItemType} from './Item';

import {namespace} from 'vuex-class';
const browser = namespace('Browser');

@Component
export default class Move extends Vue {
  private dialog = false;
  private resolve: any | null = null;
  private reject: any | null = null;
  private item: Item | null = null;
  private items: Item[] = [];
  private parentItem: Item | null = null;
  private name = '';

  @browser.Action
  public openDir!: (item: Item) => void;

  public open(item: Item): Promise<void> {
    this.dialog = true;
    this.item = item;
    this.name = item.Name;
    this.parentItem = null;

    this.items = [
      {
        Id: '',
        Type: ItemType.Directory,
        Name: 'Root',
        ParentDirId: '',
        DirId: '',
        Parent: null,
        Children: [],
      },
    ];

    return new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

  private async selectDirectory(items: Item[]): Promise<void> {
    if (items.length > 0) {
      this.parentItem = items[0];
    } else {
      this.parentItem = null;
    }
  }

  private canMove(): boolean {
    return this.name.length > 0 && this.parentItem !== null;
  }

  private async loadChildren(item: Item): Promise<void> {
    return this.openDir(item);
  }

  public async agree(): Promise<void> {
    let parentDirId = '';
    if (this.parentItem.DirId !== '') {
      parentDirId = await this.parentItem.Node.dirId()!;
    }

    this.resolve({parentDirId: parentDirId, name: this.name});
    this.dialog = false;
  }

  public cancel(): void {
    this.resolve(null);
    this.dialog = false;
  }
}
</script>
