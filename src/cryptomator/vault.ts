import Node from './node';
import {StorageAdapter} from './storage-adapter';
import scrypt from 'scrypt-js';
import {SIV} from '@stablelib/siv';
import {AES} from '@stablelib/aes';
import {v4 as uuidv4} from 'uuid';
import base32Encode from 'base32-encode';
import * as base64 from 'base64-js';

const CHUNK_SIZE = 32 * 1024;
const HEADER_SIZE = 88;
const CHUNK_HEADER_SIZE = 48;
const FULL_CHUNK_SIZE = CHUNK_SIZE + CHUNK_HEADER_SIZE;

export default class Vault {
  storageAdapter: StorageAdapter;
  encryptionKey?: CryptoKey;
  macKey?: CryptoKey;
  sivKey?: SIV;

  constructor(storageAdapter: StorageAdapter) {
    this.storageAdapter = storageAdapter;
  }

  public async open(key: string): Promise<void> {
    const config = JSON.parse(await this.storageAdapter.readFileAsText('masterkey.cryptomator'));

    const derivedKey = await scrypt.scrypt(
      new TextEncoder().encode(key),
      base64.toByteArray(config.scryptSalt),
      config.scryptCostParam,
      config.scryptBlockSize,
      1,
      32
    );

    const unwrappedKey = await window.crypto.subtle.importKey('raw', derivedKey, 'AES-KW', true, [
      'unwrapKey',
    ]);

    this.encryptionKey = await window.crypto.subtle.unwrapKey(
      'raw',
      base64.toByteArray(config.primaryMasterKey),
      unwrappedKey,
      'AES-KW',
      'AES-CTR',
      true,
      ['encrypt', 'decrypt']
    );

    this.macKey = await window.crypto.subtle.unwrapKey(
      'raw',
      base64.toByteArray(config.hmacMasterKey),
      unwrappedKey,
      'AES-KW',
      {
        name: 'HMAC',
        hash: {name: 'SHA-256'},
      },
      true,
      ['sign', 'verify']
    );

    const exportedEncryptionKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
    const exportedMacKey = await crypto.subtle.exportKey('raw', this.macKey);

    const sivKey = new Uint8Array(64);
    sivKey.set(new Uint8Array(exportedMacKey), 0);
    sivKey.set(new Uint8Array(exportedEncryptionKey), 32);
    this.sivKey = new SIV(AES, sivKey);
  }

  public async list(dirId: string): Promise<Node[]> {
    const path = await this.dirIdPath(dirId);
    const nodes = await this.storageAdapter.list(path);

    return nodes.map((n: any) => {
      return new Node(this, n.Key, dirId);
    });
  }

  public async createDirectory(name: string, parentDirId: string): Promise<string> {
    const dirId = uuidv4();
    const path = await this.dirPath(name, parentDirId);
    await this.storageAdapter.createDirectory(path, dirId);
    return dirId;
  }

  public async createFile(name: string, parentDirId: string, file: ArrayBuffer): Promise<void> {
    const path = await this.filePath(name, parentDirId);
    const payload = await this.encryptFile(new Uint8Array(file));
    await this.storageAdapter.writeFile(path, payload);
  }

  public async deleteDirectory(node: Node): Promise<void> {
    const dirId = await this.dirId(node);
    const nodes = await this.walk(dirId);
    for (const n of nodes.reverse()) {
      await this.storageAdapter.delete(n.path);
    }
    await this.storageAdapter.delete(node.path);
  }

  public async deleteFile(node: Node): Promise<void> {
    await this.storageAdapter.delete(node.path);
  }

  public async moveDirectory(node: Node, name: string, parentDirId: string): Promise<void> {
    const path = await this.dirPath(name, parentDirId);
    await this.storageAdapter.move(node.path, path);
  }

  public async moveFile(node: Node, name: string, parentDirId: string): Promise<void> {
    const path = await this.filePath(name, parentDirId);
    await this.storageAdapter.move(node.path, path);
  }

  public decryptFilename(node: Node): string | null {
    const fn = this.sivKey!.open(
      [new TextEncoder().encode(node.parentDirId)],
      base64.toByteArray(node.filename)
    );
    if (fn === null) {
      return null;
    }
    return new TextDecoder('utf8').decode(fn!);
  }

  public async dirId(node: Node): Promise<string> {
    return await this.storageAdapter.readFileAsText(node.path);
  }

  private async dirPath(name: string, parentDirId: string): Promise<string> {
    return (
      (await this.dirIdPath(parentDirId)) +
      '/' +
      (await this.encryptFilename(name, parentDirId)) +
      '/dir.c9r'
    );
  }

  async filePath(name: string, parentDirId: string): Promise<string> {
    return (
      (await this.dirIdPath(parentDirId)) + '/' + (await this.encryptFilename(name, parentDirId))
    );
  }

  private async dirIdPath(dirId: string): Promise<string> {
    const ciphertext = this.sivKey!.seal([], new TextEncoder().encode(dirId));
    const hash = await crypto.subtle.digest('SHA-1', ciphertext);
    const encoded = base32Encode(hash, 'RFC4648', {padding: false});
    return 'd/' + encoded.slice(0, 2) + '/' + encoded.slice(2);
  }

  private encryptFilename(filename: string, dirId: string): string | null {
    const ciphertext = this.sivKey!.seal(
      [new TextEncoder().encode(dirId)],
      new TextEncoder().encode(filename)
    );
    if (ciphertext === undefined) {
      return null;
    }

    const encodedPath = base64.fromByteArray(ciphertext).replaceAll('+', '-').replaceAll('/', '_');

    return encodedPath + '.c9r';
  }

  private async walk(dirId: string, nodes: Node[] = []): Promise<Node[]> {
    const path = await this.dirIdPath(dirId);
    const currentNodes = await this.storageAdapter.list(path);

    for (const n of currentNodes) {
      const node = new Node(this, n.Key, dirId);
      nodes.push(node);
      if (node.isDir) {
        const dirId = await node.dirId();
        await this.walk(dirId, nodes);
      }
    }
    return nodes;
  }

  public async decryptFile(node: Node): Promise<Uint8Array> {
    const obj = await this.storageAdapter.readFile(node.path);
    const data = obj.Data!;

    const headerNonce = data.slice(0, 16);
    const headerPayload = data.slice(16, 56);
    const headerMac = data.slice(56, 88);

    // Validate header mac
    const isVerified = await window.crypto.subtle.verify(
      {name: 'HMAC', hash: 'SHA-256'},
      this.macKey!,
      headerMac,
      data.slice(0, 56)
    );

    if (!isVerified) {
      throw new Error('Could not verify header.');
    }

    const wrapped = await window.crypto.subtle.decrypt(
      {name: 'AES-CTR', length: 32, counter: headerNonce},
      this.encryptionKey!,
      headerPayload
    );

    const contentKey = await window.crypto.subtle.importKey(
      'raw',
      wrapped.slice(8, 40),
      'AES-CTR',
      true,
      ['decrypt']
    );

    const len = data.length;
    let decryptedSize = len - HEADER_SIZE;

    // Calc result size
    const lastChunkSize = decryptedSize % FULL_CHUNK_SIZE;
    let chunkCount = 0;
    if (lastChunkSize === 0) {
      chunkCount = decryptedSize / FULL_CHUNK_SIZE;
    } else {
      chunkCount = 1 + decryptedSize / FULL_CHUNK_SIZE;
    }

    chunkCount = Math.floor(chunkCount);
    decryptedSize -= chunkCount * CHUNK_HEADER_SIZE;
    const decryptedData = new Uint8Array(decryptedSize);

    for (let i = 0; i < chunkCount; i++) {
      const start = HEADER_SIZE + i * FULL_CHUNK_SIZE;
      let end = start + FULL_CHUNK_SIZE;
      if (end > decryptedSize) {
        end = len;
      }

      const chunk = data.slice(start, end);

      const chunkNonce = chunk.slice(0, 16);
      const chunkData = chunk.slice(16, -32);
      const chunkMac = chunk.slice(-32);

      const mac = new Uint8Array(16 + 8 + 16 + chunkData.length);
      mac.set(headerNonce);
      mac.set(new Uint8Array(this.toBytes(i)), 16);
      mac.set(chunkNonce, 24);
      mac.set(chunkData, 40);
      const isVerified = await window.crypto.subtle.verify(
        {name: 'HMAC', hash: 'SHA-256'},
        this.macKey!,
        chunkMac,
        mac
      );

      if (!isVerified) {
        throw new Error('Could not verify chunk.');
      }

      const plaintext = await window.crypto.subtle.decrypt(
        {name: 'AES-CTR', length: 32, counter: chunkNonce},
        contentKey,
        chunkData
      );

      decryptedData.set(new Uint8Array(plaintext), i * CHUNK_SIZE);
    }

    return decryptedData;
  }

  public async encryptFile(data: Uint8Array): Promise<Uint8Array> {
    const len = data.length;
    const chunkCount = Math.ceil(len / CHUNK_SIZE);
    const file = new Uint8Array(HEADER_SIZE + chunkCount * FULL_CHUNK_SIZE);

    const headerNonce = window.crypto.getRandomValues(new Uint8Array(16));
    const headerPayload = new Uint8Array(40);
    headerPayload.set(new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]), 0);
    const contentKey = await window.crypto.subtle.generateKey(
      {
        name: 'AES-CTR',
        length: 256,
      },
      true,
      ['encrypt']
    );
    const exportedContentKey = await crypto.subtle.exportKey('raw', contentKey);
    headerPayload.set(new Uint8Array(exportedContentKey), 8);

    const headerCiphertext = await window.crypto.subtle.encrypt(
      {name: 'AES-CTR', length: 32, counter: headerNonce},
      this.encryptionKey!,
      headerPayload
    );

    const mac = new Uint8Array(56);
    mac.set(headerNonce, 0);
    mac.set(new Uint8Array(headerCiphertext), 16);
    const headerMac = await window.crypto.subtle.sign(
      {name: 'HMAC', hash: 'SHA-256'},
      this.macKey!,
      mac
    );

    file.set(headerNonce, 0);
    file.set(new Uint8Array(headerCiphertext), 16);
    file.set(new Uint8Array(headerMac), 56);

    let pos = HEADER_SIZE;
    for (let i = 0; i < chunkCount; i++) {
      const fileStart = i * CHUNK_SIZE;
      const fileEnd = fileStart + CHUNK_SIZE;
      const chunkNonce = window.crypto.getRandomValues(new Uint8Array(16));
      const chunkCiphertext = await window.crypto.subtle.encrypt(
        {name: 'AES-CTR', length: 32, counter: chunkNonce},
        contentKey,
        data.slice(fileStart, fileEnd)
      );

      const mac = new Uint8Array(16 + 8 + 16 + chunkCiphertext.byteLength);
      mac.set(headerNonce, 0);
      mac.set(new Uint8Array(this.toBytes(i)), 16);
      mac.set(chunkNonce, 24);
      mac.set(new Uint8Array(chunkCiphertext), 40);
      const chunkMac = await window.crypto.subtle.sign(
        {name: 'HMAC', hash: 'SHA-256'},
        this.macKey!,
        mac
      );

      file.set(chunkNonce, pos);
      file.set(new Uint8Array(chunkCiphertext), pos + 16);
      file.set(new Uint8Array(chunkMac), pos + 16 + chunkCiphertext.byteLength);

      pos += 16 + chunkCiphertext.byteLength + 32;
    }

    return file.slice(0, pos);
  }

  private toBytes(num: number): ArrayBuffer {
    const arr = new ArrayBuffer(8);
    const view = new DataView(arr);
    view.setBigUint64(0, window.BigInt(num));
    return arr;
  }
}
