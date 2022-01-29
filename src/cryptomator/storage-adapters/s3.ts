import {StorageObject, StorageAdapter} from '../storage-adapter';
import AWS from 'aws-sdk';
import {
  GetObjectRequest,
  ListObjectsRequest,
  PutObjectRequest,
  DeleteObjectRequest,
  CopyObjectRequest,
} from 'aws-sdk/clients/s3';

export default class S3 implements StorageAdapter {
  s3: AWS.S3;
  bucket: string;

  constructor(accessKeyId: string, secretAccessKey: string, region: string, bucket: string) {
    this.bucket = bucket;

    AWS.config.region = region;
    AWS.config.credentials = new AWS.Credentials(accessKeyId, secretAccessKey, undefined);

    this.s3 = new AWS.S3({apiVersion: '2006-03-01'});
  }

  public async list(prefix: string): Promise<StorageObject[]> {
    try {
      const params: ListObjectsRequest = {
        Bucket: this.bucket,
        Prefix: prefix,
      };
      const result = await this.s3.listObjects(params).promise();
      const objs: StorageObject[] = [];
      for (const o of result.Contents!) {
        objs.push({Key: o.Key!, Size: o.Size, LastModified: o.LastModified});
      }
      return objs;
    } catch (error) {
      throw new Error('Could not list directory.');
    }
  }

  public async readFile(key: string): Promise<StorageObject> {
    try {
      const params: GetObjectRequest = {Bucket: this.bucket, Key: key};
      const res = await this.s3.getObject(params).promise();
      return {Key: key, Data: res.Body};
    } catch (error) {
      throw new Error('Could not retrieve object.');
    }
  }

  public async readFileAsText(key: string): Promise<string> {
    try {
      const obj = await this.readFile(key);
      return new TextDecoder('utf8').decode(obj.Data!);
    } catch (error) {
      throw new Error('Could not retrieve object as text.');
    }
  }

  public async createDirectory(path: string, dirId: string): Promise<void> {
    try {
      const params: PutObjectRequest = {
        Bucket: this.bucket,
        Key: path,
        Body: dirId,
      };
      await this.s3.putObject(params).promise();
    } catch (error) {
      throw new Error('Could not create directory.');
    }
  }

  public async writeFile(path: string, contents: Uint8Array | Blob | string): Promise<void> {
    try {
      const params: PutObjectRequest = {
        Bucket: this.bucket,
        Key: path,
        Body: contents,
      };
      await this.s3.putObject(params).promise();
    } catch (error) {
      throw new Error('Could not write file.');
    }
  }

  public async delete(path: string): Promise<void> {
    try {
      const params: DeleteObjectRequest = {
        Bucket: this.bucket,
        Key: path,
      };
      const res = await this.s3.deleteObject(params).promise();
    } catch (error) {
      throw new Error('Could not delete file.');
    }
  }

  public async move(oldPath: string, newPath: string): Promise<void> {
    try {
      const params: CopyObjectRequest = {
        Bucket: this.bucket,
        CopySource: `/${this.bucket}/${oldPath}`,
        Key: newPath,
      };
      await this.s3.copyObject(params).promise();
      await this.delete(oldPath);
    } catch (error) {
      throw new Error('Could not move file.');
    }
  }
}
