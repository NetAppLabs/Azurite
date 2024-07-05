import {
  S3Client,
  ListBucketsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import multistream = require("multistream");

import { ZERO_EXTENT_ID } from "../../blob/persistence/IBlobMetadataStore";
import {
  DEFAULT_READ_CONCURRENCY
} from "../utils/constants";
import ILogger from "../ILogger";
import ZeroBytesStream from "../ZeroBytesStream";
import IExtentMetadataStore from "./IExtentMetadataStore";
import IExtentStore, { IExtentChunk } from "./IExtentStore";
import IOperationQueue from "./IOperationQueue";
import OperationQueue from "./OperationQueue";
import NotImplementedError from "../../blob/errors/NotImplementedError";

export default class S3ExtentStore implements IExtentStore {
  private readonly metadataStore: IExtentMetadataStore;
  private readonly readQueue: IOperationQueue;

  private initialized: boolean = false;
  private closed: boolean = true;

  private s3Endpoint: string = process.env.S3_ENDPOINT || "";
  private accessKeyId: string = process.env.S3_ACCESS_KEY_ID || "";
  private secretAccessKey: string = process.env.S3_SECRET_ACCESS_KEY || "";

  public constructor(
    metadata: IExtentMetadataStore,
    private readonly logger: ILogger,
  ) {
    this.metadataStore = metadata;
    this.readQueue = new OperationQueue(DEFAULT_READ_CONCURRENCY, logger);
  }

  private getS3Client(): S3Client {
    return new S3Client({
      endpoint: this.s3Endpoint,
      forcePathStyle: true, // Required for custom endpoints
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey
      },
      region: 'ontap'
    });
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public async init(): Promise<void> {
    const s3 = this.getS3Client();
    try {
      const command = new ListBucketsCommand({});
      await s3.send(command);
    } catch (err) {
      throw new Error(`S3ExtentStore:init() Error: ${err.message}`);
    }

    if (!this.metadataStore.isInitialized()) {
      await this.metadataStore.init();
    }

    this.initialized = true;
    this.closed = false;
  }

  public async close(): Promise<void> {
    if (!this.metadataStore.isClosed()) {
      await this.metadataStore.close();
    }

    this.closed = true;
  }

  public async clean(): Promise<void> {
    throw new NotImplementedError("clean is not implemented.");
  }

  public async appendExtent(
    data: NodeJS.ReadableStream | Buffer,
    contextId?: string
  ): Promise<IExtentChunk> {
    throw new NotImplementedError("appendExtent is not implemented.");
  }

  public async readExtent(
    extentChunk?: IExtentChunk,
    contextId?: string
  ): Promise<NodeJS.ReadableStream> {
    this.logger.debug(`readExtent: ${JSON.stringify(extentChunk)}, ${contextId}`)
    if (extentChunk === undefined || extentChunk.count === 0) {
      return new ZeroBytesStream(0);
    }

    if (extentChunk.id === ZERO_EXTENT_ID) {
      const subRangeCount = Math.min(extentChunk.count);
      return new ZeroBytesStream(subRangeCount);
    }

    // const persistencyId = await this.metadataStore.getExtentLocationId(extentChunk.id);
    this.logger.debug(`Reading file ${extentChunk.id}`)

    const op = () =>
      new Promise<NodeJS.ReadableStream>((resolve, reject) => {
        const getObjectCommand = new GetObjectCommand({
          Bucket: extentChunk.id.split("/")[0],
          Key: extentChunk.id.split("/")[1],
        });
        const s3Client = this.getS3Client();
        s3Client.send(getObjectCommand)
          .then(data => {
            const stream = data.Body as NodeJS.ReadableStream;
            resolve(stream);
          })
          .catch(reject);
      });

    return this.readQueue.operate(op, contextId);
  }

  public async readExtents(
    extentChunkArray: IExtentChunk[],
    offset: number = 0,
    count: number = Infinity,
    contextId?: string
  ): Promise<NodeJS.ReadableStream> {
    if (count === 0) {
      return new ZeroBytesStream(0);
    }

    const start = offset; // Start inclusive position in the merged stream
    const end = offset + count; // End exclusive position in the merged stream

    const streams: NodeJS.ReadableStream[] = [];
    let accumulatedOffset = 0; // Current payload offset in the merged stream

    for (const chunk of extentChunkArray) {
      const nextOffset = accumulatedOffset + chunk.count;

      if (nextOffset <= start) {
        accumulatedOffset = nextOffset;
        continue;
      } else if (end <= accumulatedOffset) {
        break;
      } else {
        let chunkStart = chunk.offset;
        let chunkEnd = chunk.offset + chunk.count;
        if (start > accumulatedOffset) {
          chunkStart = chunkStart + start - accumulatedOffset; // Inclusive
        }

        if (end <= nextOffset) {
          chunkEnd = chunkEnd - (nextOffset - end); // Exclusive
        }

        streams.push(
          await this.readExtent(
            {
              id: chunk.id,
              offset: chunkStart,
              count: chunkEnd - chunkStart
            },
            contextId
          )
        );
        accumulatedOffset = nextOffset;
      }
    }

    if (end !== Infinity && accumulatedOffset < end) {
      throw new RangeError(
        `Not enough payload data error. Total length of payloads is ${accumulatedOffset}, while required data offset is ${offset}, count is ${count}.`
      );
    }

    return multistream(streams);
  }

  public async deleteExtents(extents: Iterable<string>): Promise<number> {
    throw new NotImplementedError("deleteExtents is not implemented.");
  }

  public getMetadataStore(): IExtentMetadataStore {
    return this.metadataStore;
  }
}