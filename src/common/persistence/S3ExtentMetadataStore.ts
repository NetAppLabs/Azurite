import {
  S3Client,
  ListObjectsV2Command,
  ListBucketsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import AllExtentsAsyncIterator from "./AllExtentsAsyncIterator";
import IExtentMetadataStore, { IExtentModel } from "./IExtentMetadataStore";
import NotImplementedError from "../../blob/errors/NotImplementedError";

/**
 * An S3 based extent metadata storage implementation.
 *
 * @export
 * @class S3ExtentMetadataStore
 * @implements {IExtentMetadataStore}
 */
export default class S3ExtentMetadataStore implements IExtentMetadataStore {
  private initialized: boolean = false;
  private closed: boolean = false;
  private readonly s3Endpoint: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  /**
   * Creates an instance of S3ExtentMetadataStore.
   *
   * @param {string} bucketName The name of the S3 bucket.
   * @param {string} s3Endpoint The S3 endpoint.
   * @param {string} accessKeyId The access key ID.
   * @param {string} secretAccessKey The secret access key.
   * @memberof S3ExtentMetadataStore
   */
  public constructor() {
    this.s3Endpoint = process.env.S3_ENDPOINT || "",
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "",
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || ""
  }

  private getS3Client(): S3Client {
    return new S3Client({
      endpoint: this.s3Endpoint,
      forcePathStyle: true, // Required for custom endpoints
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      },
      region: 'ontap' // Replace with your region
    });
  }

  public async init(): Promise<void> {
    const s3 = this.getS3Client();
    try {
      const command = new ListBucketsCommand({});
      await s3.send(command);
    } catch (err) {
      throw new Error(`S3ExtentMetadataStore:init() Error: ${err.message}`);
    }

    this.initialized = true;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async close(): Promise<void> {
    // No specific close operation for S3
    this.closed = true;
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public async clean(): Promise<void> {
    throw new NotImplementedError("clean is not implemented.");
    // const s3 = this.getS3Client();
    // const listObjectsCommand = new ListObjectsV2Command({ Bucket: this.bucketName });
    // const listedObjects = await s3.send(listObjectsCommand);
    // if (listedObjects.Contents && listedObjects.Contents.length > 0) {
    //   const deleteParams = {
    //     Bucket: this.bucketName,
    //     Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) }
    //   };
    //   const deleteObjectsCommand = new DeleteObjectsCommand(deleteParams);
    //   await s3.send(deleteObjectsCommand);
    // }
  }

  public async listExtents(
    id?: string,
    maxResults?: number,
    marker?: number | string | undefined,
    queryTime?: Date,
    protectTimeInMs?: number
  ): Promise<[IExtentModel[], number | undefined]> {
    const s3 = this.getS3Client();
    const extents: IExtentModel[] = [];
    let nextMarker: string | undefined = undefined;

    try {
      // List all buckets
      const listBucketsCommand = new ListBucketsCommand({});
      const bucketsResponse = await s3.send(listBucketsCommand);

      if (!bucketsResponse.Buckets) {
        return [extents, nextMarker];
      }

      // Iterate over each bucket
      for (const bucket of bucketsResponse.Buckets) {
        const bucketName = bucket.Name!;
        const params = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: maxResults,
          StartAfter: marker as string
        });

        const listedObjects = await s3.send(params);

        for (const item of listedObjects.Contents || []) {
          const path = bucketName + "/" + item.Key;
          const model: IExtentModel = {
            id: path,
            lastModifiedInMS: item.LastModified!.getTime(),
            path: path,
            locationId: path,
            size: item.Size!,
          }

          extents.push(model);
        }
      }
    } catch (err) {
      throw new Error(`S3ExtentMetadataStore:listExtents() Error: ${err.message}`);
    }

    return [extents, nextMarker];
  }

  public async getExtentLocationId(extentId: string): Promise<string> {
    const s3 = this.getS3Client();
    const bucket = extentId.split("/")[0];
    const params = {
      Bucket: bucket,
      Key: extentId
    };
    const getObjectCommand = new GetObjectCommand(params);
    const data = await s3.send(getObjectCommand);
    if (!data.Body) {
      throw new Error(`S3ExtentMetadataStore:getExtentLocationId() Error. Extent not exists.`);
    }
    const extent = JSON.parse(data.Body.toString()) as IExtentModel;
    return extent.locationId;
  }

  public iteratorExtents(): AsyncIterator<string[]> {
    return new AllExtentsAsyncIterator(this);
  }

  public async updateExtent(extent: IExtentModel): Promise<void> {
    throw new NotImplementedError("updateExtent is not implemented.");
  }

  public async deleteExtent(extentId: string): Promise<void> {
    throw new NotImplementedError("deleteExtent is not implemented.");
  }
}