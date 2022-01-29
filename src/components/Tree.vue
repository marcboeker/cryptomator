<template>
  <v-card flat tile min-width="250" class="d-flex flex-column folders-tree-card">
    <div class="grow scroll-x">
      <v-treeview
        :active="activeDirectories"
        :open="openDirectories"
        :items="directories"
        @update:active="openDir"
        item-key="Id"
        item-text="Name"
        item-children="Children"
        :return-object="true"
        dense
        activatable
        hoverable
        class="folders-tree"
      >
        <template v-slot:prepend="{open}">
          <v-icon>{{ open ? 'mdi-folder-open-outline' : 'mdi-folder-outline' }}</v-icon>
        </template>
        <template v-slot:label="{item}">
          <span class="directory">{{ item.Name }}</span>
        </template>
      </v-treeview>
    </div>
  </v-card>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import {Item} from './Item';

import {namespace} from 'vuex-class';
const browser = namespace('Browser');

@Component
export default class Tree extends Vue {
  @browser.State
  private directories!: Item[];

  @browser.State
  public openDirectories!: Item[];

  @browser.State
  public activeDirectories!: Item[];

  @browser.Mutation
  public openDirectory!: (item: Item) => void;

  @browser.Action
  public loadDir!: (item: Item) => Promise<void>;

  private async refresh(item: Item): Promise<void> {
    await this.loadDir(item);
  }

  private async openDir(items: Item[]): Promise<void> {
    if (items.length > 0) {
      await this.loadDir(items[0]);
      this.openDirectory(items[0]);
    }
  }
}
</script>

<style land="scss" scoped>
.directory {
  cursor: pointer;
}

.folders-tree-card {
  height: 100%;

  .scroll-x {
    overflow-x: auto;
  }

  ::v-deep .folders-tree {
    width: fit-content;
    min-width: 250px;

    .v-treeview-node {
      cursor: pointer;

      &:hover {
        background-color: rgba(0, 0, 0, 0.02);
      }
    }
  }
}
</style>
