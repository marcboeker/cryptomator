import Node from '../cryptomator/node';

export enum ItemType {
  Directory = 1,
  File,
}

export interface Item {
  Id: string;
  Type: ItemType;
  Name: string;
  Extension?: string;
  ParentDirId: string;
  DirId?: string;
  Node?: Node;
  Parent: Item | null;
  Children: Item[];
}
