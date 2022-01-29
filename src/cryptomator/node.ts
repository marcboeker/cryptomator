import {StorageAdapter} from './storage-adapter';
import Vault from './vault';

class Node {
  private vault: Vault;
  public path: string;
  public isDir: boolean;
  public parentDirId: string;
  public name: string | null;
  public filename: string;

  constructor(vault: Vault, path: string, parentDirId: string) {
    this.vault = vault;
    this.path = path;
    this.isDir = this.path.indexOf('/dir.c9r') > -1;
    this.parentDirId = parentDirId;
    this.filename = this.extractFilename();
    this.name = this.decryptName();
  }

  private decryptName(): string | null {
    return this.vault.decryptFilename(this);
  }

  private extractFilename(): string {
    const chunks = this.path.split(/\//);
    let filename!: string;
    if (this.isDir) {
      filename = chunks.slice(-2, -1)[0];
    } else {
      filename = chunks.pop()!;
    }
    return filename.replace('.c9r', '');
  }

  public async dirId(): Promise<string> {
    return await this.vault.dirId(this);
  }

  public async decrypt(): Promise<Uint8Array> {
    // let filename = this.path.split(/\//).pop();
    // let contentPath = this.path
    // if (filename.length > 220) {
    //   contentPath = this.path + "/contents.c9r"
    // }
    return this.vault.decryptFile(this);
  }
}

export default Node;
