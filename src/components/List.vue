<template>
  <v-card flat tile min-height="380" class="d-flex flex-column">
    <confirm ref="confirm"></confirm>
    <move ref="move"></move>
    <v-card-text v-if="directories.length > 0">
      <v-list subheader>
        <v-subheader class="pl-1">Directories</v-subheader>
        <v-list-item v-for="item in directories" :key="item.Id" @click="open(item)" class="pl-0">
          <v-list-item-avatar class="ma-0">
            <v-icon>mdi-folder-outline</v-icon>
          </v-list-item-avatar>

          <v-list-item-content class="py-2">
            <v-list-item-title v-text="item.Name"></v-list-item-title>
          </v-list-item-content>

          <v-list-item-action>
            <v-btn icon @click.stop="moveItem(item)">
              <v-icon color="grey lighten-1">mdi-folder-move</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action>
            <v-btn icon @click.stop="removeItem(item)">
              <v-icon color="grey lighten-1">mdi-delete-outline</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-text v-if="files.length > 0">
      <v-list subheader>
        <v-subheader class="pl-1">Files</v-subheader>
        <v-list-item v-for="item in files" :key="item.Id" @click="download(item)" class="pl-0">
          <v-list-item-avatar class="ma-0">
            <v-icon>{{ fileIcons[item.Extension] || fileIcons['other'] }}</v-icon>
          </v-list-item-avatar>

          <v-list-item-content class="py-2">
            <v-list-item-title v-text="item.Name"></v-list-item-title>
          </v-list-item-content>

          <v-list-item-action>
            <v-btn icon @click.stop="moveItem(item)">
              <v-icon color="grey lighten-1">mdi-file-move</v-icon>
            </v-btn>
          </v-list-item-action>
          <v-list-item-action>
            <v-btn icon @click.stop="removeItem(item)">
              <v-icon color="grey lighten-1">mdi-delete-outline</v-icon>
            </v-btn>
          </v-list-item-action>
        </v-list-item>
      </v-list>
    </v-card-text>
    <v-card-text v-if="files.length === 0 && directories.length === 0">
      <v-list subheader>
        <v-subheader class="pl-1">No files and directories available.</v-subheader>
      </v-list>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {Item, ItemType} from './Item';

import Confirm from './Confirm.vue';
import Move from './Move.vue';
import Node from '../cryptomator/node';

import {namespace} from 'vuex-class';
const browser = namespace('Browser');

@Component({
  components: {
    Confirm,
    Move,
  },
})
export default class List extends Vue {
  @browser.State
  private items!: Item[];

  @browser.Mutation
  public openDirectory!: (item: Item) => void;

  @browser.Action
  public remove!: (item: Item) => Promise<void>;

  @browser.Action
  public loadDir!: (item: Item) => Promise<void>;

  @browser.Action
  public reload!: () => Promise<void>;

  @browser.Action
  public move!: ({
    node,
    parentDirId,
    name,
  }: {
    node: Node;
    parentDirId: string;
    name: string;
  }) => Promise<void>;

  private fileIcons = {
    zip: 'mdi-folder-zip-outline',
    rar: 'mdi-folder-zip-outline',
    htm: 'mdi-language-html5',
    html: 'mdi-language-html5',
    js: 'mdi-nodejs',
    json: 'mdi-json',
    md: 'mdi-markdown',
    pdf: 'mdi-file-pdf',
    png: 'mdi-file-image',
    jpg: 'mdi-file-image',
    jpeg: 'mdi-file-image',
    mp4: 'mdi-filmstrip',
    mkv: 'mdi-filmstrip',
    avi: 'mdi-filmstrip',
    wmv: 'mdi-filmstrip',
    mov: 'mdi-filmstrip',
    txt: 'mdi-file-document-outline',
    xls: 'mdi-file-excel',
    other: 'mdi-file-outline',
  };

  private itemType = ItemType;

  get directories(): Item[] {
    return this.items.filter(i => {
      return i.Type === ItemType.Directory;
    });
  }

  get files(): Item[] {
    return this.items.filter(i => {
      return i.Type === ItemType.File;
    });
  }

  private async open(item: Item): Promise<void> {
    await this.loadDir(item);
    this.openDirectory(item);
  }

  private async download(item: Item): Promise<void> {
    const options = {
      suggestedName: item.Name,
    };
    try {
      const handle = await (window as any).showSaveFilePicker(options);
      const writable = await handle.createWritable();
      await writable.write(await item.Node!.decrypt());
      await writable.close();
    } catch (error) {
      return;
    }
  }

  async removeItem(item: Item): Promise<void> {
    let confirmed = await (this.$refs.confirm as any).open(
      'Delete',
      `Are you sure you want to delete this ${
        item.Type === ItemType.Directory ? 'directory' : 'file'
      }?<br><em>${item.Name}</em>`
    );

    if (confirmed) {
      await this.remove(item);
      await this.reload();
    }
  }

  async moveItem(item: Item): Promise<void> {
    let move = await (this.$refs.move as any).open(item);
    if (move !== null) {
      await this.move({
        node: item.Node!,
        parentDirId: move.parentDirId,
        name: move.name,
      });
      await this.reload();
    }
  }
}
</script>

<style lang="scss" scoped>
.v-card {
  height: 100%;
}
</style>
