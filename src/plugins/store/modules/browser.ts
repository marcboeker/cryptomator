import {VuexModule, Module, Mutation, Action, MutationAction} from 'vuex-module-decorators';
import {Item, ItemType} from '../../../components/Item';
import Vault from '../../../cryptomator/vault';
import Node from '../../../cryptomator/node';
import {v4 as uuidv4} from 'uuid';

@Module({namespaced: true})
export default class Browser extends VuexModule {
  vault!: Vault;
  openDirectories: Item[] = [];
  activeDirectories: Item[] = [];
  currentItem: Item | null = null;
  currentParentDirId: string | null = null;
  directories: Item[] = [];
  items: Item[] = [];

  @Mutation
  public openDirectory(item: Item): void {
    this.openDirectories.push(item);
    this.activeDirectories = [item];
  }

  @Mutation
  public setVault(vault: Vault): void {
    this.vault = vault;
  }

  @Mutation
  public setCurrentItem(item: Item): void {
    this.currentItem = item;
  }

  @Mutation
  public setCurrentParentDirId(parentDirId: string): void {
    this.currentParentDirId = parentDirId;
  }

  @Action
  public async remove(item: Item): Promise<any> {
    if (item.Type === ItemType.Directory) {
      await this.vault.deleteDirectory(item.Node!);
      const currentParentDirId = item.Node?.parentDirId;

      if (item.Parent) {
        const index = item.Parent!.Children.indexOf(item);
        if (index > -1) {
          item.Parent!.Children.splice(index, 1);
        }
      }

      return {currentParentDirId};
    } else {
      await this.vault.deleteFile(item.Node!);
      return {};
    }
  }

  @Action
  public async createDirectory(name: string): Promise<void> {
    if (name) {
      const dirId = await this.vault.createDirectory(name, this.currentParentDirId!);
    }
    return;
  }

  @Action
  public async upload(files: any): Promise<void> {
    if (files.length === 0) {
      return;
    }
    for (const f of files) {
      const file = await f.getFile();
      await this.vault.createFile(file.name, this.currentParentDirId!, await file.arrayBuffer());
    }
  }

  @Action
  public async download(node: Node): Promise<Uint8Array> {
    return await node.decrypt();
  }

  @Action({rawError: true})
  public async move({
    node,
    parentDirId,
    name,
  }: {
    node: Node;
    parentDirId: string;
    name: string;
  }): Promise<void> {
    if (node.isDir) {
      await this.vault.moveDirectory(node, name, parentDirId);
    } else {
      await this.vault.moveFile(node, name, parentDirId);
    }
  }

  @Action
  public setRoot(): void {
    this.directories.push({
      Id: '',
      Type: ItemType.Directory,
      Name: 'Root',
      ParentDirId: '',
      DirId: '',
      Parent: null,
      Children: [],
    });
  }

  @MutationAction({mutate: ['items']})
  async reload() {
    const items = [];

    if (this.currentItem === null || this.currentParentDirId === null) {
      return null;
    }

    this.currentItem!.Children = [];
    const nodes = await this.vault.list(this.currentParentDirId!);
    for (const n of nodes) {
      const itm = {
        Id: uuidv4(),
        Type: n.isDir ? ItemType.Directory : ItemType.File,
        Name: n.name || '',
        ParentDirId: n.parentDirId,
        Node: n,
        Parent: this.currentItem,
        Children: [],
      };

      if (n.isDir && this.currentItem !== null) {
        this.currentItem.Children.push(itm);
      }

      items.push(itm);
    }

    return {items: items};
  }

  @MutationAction({
    mutate: ['currentItem', 'currentParentDirId', 'items'],
  })
  async loadDir(item: Item) {
    let parentDirId = item.DirId;
    if (item.DirId !== '') {
      parentDirId = await item.Node?.dirId();
    }

    const currentItem = item;
    const currentParentDirId = parentDirId!;

    const items = [];
    item.Children = [];
    const nodes = await this.vault.list(parentDirId!);
    for (const n of nodes) {
      const itm = {
        Id: uuidv4(),
        Type: n.isDir ? ItemType.Directory : ItemType.File,
        Name: n.name || '',
        ParentDirId: n.parentDirId,
        Node: n,
        Parent: null,
        Children: [],
      };

      if (n.isDir) {
        item.Children.push(itm);
      }

      items.push(itm);
    }

    return {
      currentItem: currentItem,
      currentParentDirId: currentParentDirId,
      items: items,
    };
  }

  @Action
  async openDir(item: Item): Promise<void> {
    let parentDirId = item.DirId;
    if (item.DirId !== '') {
      parentDirId = await item.Node?.dirId();
    }

    item.Children = [];
    const nodes = await this.vault.list(parentDirId!);
    for (const n of nodes) {
      const itm = {
        Id: uuidv4(),
        Type: n.isDir ? ItemType.Directory : ItemType.File,
        Name: n.name || '',
        ParentDirId: n.parentDirId,
        Node: n,
        Parent: null,
        Children: [],
      };

      if (n.isDir) {
        item.Children.push(itm);
      }
    }

    return;
  }
}
