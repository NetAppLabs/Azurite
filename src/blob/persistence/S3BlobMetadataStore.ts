import { S3Client, ListBucketsCommand, ListBucketsCommandOutput, ListObjectsV2Command, ListObjectsV2CommandOutput, HeadBucketCommand, GetObjectCommand, HeadObjectCommand, HeadObjectCommandOutput, GetObjectCommandOutput } from "@aws-sdk/client-s3";

import IGCExtentProvider from "../../common/IGCExtentProvider";
import { newEtag } from "../../common/utils/utils";
import NotImplementedError from "../errors/NotImplementedError";
import StorageErrorFactory from "../errors/StorageErrorFactory";
import * as Models from "../generated/artifacts/models";
import Context from "../generated/Context";
// import { Readable } from "stream";
import {
  DEFAULT_LIST_BLOBS_MAX_RESULTS,
  DEFAULT_LIST_CONTAINERS_MAX_RESULTS,
} from "../utils/constants";
import BlobReferredExtentsAsyncIterator from "./BlobReferredExtentsAsyncIterator";
import IBlobMetadataStore, {
  AcquireBlobLeaseResponse,
  AcquireContainerLeaseResponse,
  BlobId,
  BlobModel,
  BlobPrefixModel,
  BlockModel,
  BreakBlobLeaseResponse,
  BreakContainerLeaseResponse,
  ChangeBlobLeaseResponse,
  ChangeContainerLeaseResponse,
  ContainerModel,
  CreateSnapshotResponse,
  GetBlobPropertiesRes,
  GetContainerAccessPolicyResponse,
  GetContainerPropertiesResponse,
  GetPageRangeResponse,
  IContainerMetadata,
  IExtentChunk,
  ReleaseBlobLeaseResponse,
  ReleaseContainerLeaseResponse,
  RenewBlobLeaseResponse,
  RenewContainerLeaseResponse,
  ServicePropertiesModel,
  SetContainerAccessPolicyOptions
} from "./IBlobMetadataStore";

/**
 * This is a metadata source implementation for blob based on loki DB.
 *
 * Notice that, following design is for emulator purpose only, and doesn't design for best performance.
 * We may want to optimize the persistency layer performance in the future. Such as by distributing metadata
 * into different collections, or make binary payload write as an append-only pattern.
 *
 * Loki DB includes following collections and documents:
 *
 * -- SERVICE_PROPERTIES_COLLECTION // Collection contains service properties
 *                                  // Default collection name is $SERVICES_COLLECTION$
 *                                  // Each document maps to 1 account blob service
 *                                  // Unique document properties: accountName
 * -- CONTAINERS_COLLECTION  // Collection contains all containers
 *                           // Default collection name is $CONTAINERS_COLLECTION$
 *                           // Each document maps to 1 container
 *                           // Unique document properties: accountName, (container)name
 * -- BLOBS_COLLECTION       // Collection contains all blobs
 *                           // Default collection name is $BLOBS_COLLECTION$
 *                           // Each document maps to a blob
 *                           // Unique document properties: accountName, containerName, (blob)name, snapshot
 * -- BLOCKS_COLLECTION      // Block blob blocks collection includes all UNCOMMITTED blocks
 *                           // Unique document properties: accountName, containerName, blobName, name, isCommitted
 *
 * @export
 * @class S3BlobMetadataStore
 */
export default class S3BlobMetadataStore
  implements IBlobMetadataStore, IGCExtentProvider {

  private initialized: boolean = false;
  private closed: boolean = true;

  private s3Endpoint: string = process.env.S3_ENDPOINT || "";
  private accessKeyId: string = process.env.S3_ACCESS_KEY_ID || "";
  private secretAccessKey: string = process.env.S3_SECRET_ACCESS_KEY || "";

  // private readonly SERVICES_COLLECTION = "$SERVICES_COLLECTION$";
  // private readonly CONTAINERS_COLLECTION = "$CONTAINERS_COLLECTION$";
  // private readonly BLOBS_COLLECTION = "$BLOBS_COLLECTION$";
  // private readonly BLOCKS_COLLECTION = "$BLOCKS_COLLECTION$";

  // private readonly pageBlobRangesManager = new PageBlobRangesManager();

  public constructor() {
    // this.s3 = new AWS.S3({
    //   endpoint: 'http://10.115.97.6', // Replace with your S3 endpoint
    //   s3ForcePathStyle: true, // Required for custom endpoints
    //   accessKeyId: '396MV21CAOIWLBSQOBZT', // Replace with your access key
    //   secretAccessKey: '_Rb78_L7_N7Kp88ua1eQ7FnAwygz91R1mU9_ggBY' // Replace with your secret key
    // });

    // this.s3 = new S3Client({
    //   endpoint: 'http://10.115.97.6', // Replace with your S3 endpoint
    //   forcePathStyle: true, // Required for custom endpoints
    //   credentials: {
    //     accessKeyId: '396MV21CAOIWLBSQOBZT', // Replace with your access key
    //     secretAccessKey: '_Rb78_L7_N7Kp88ua1eQ7FnAwygz91R1mU9_ggBY' // Replace with your secret key
    //   },
    //   region: 'ontap' // Replace with your region
    // });
    this.s3Endpoint = process.env.S3_ENDPOINT || "",
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "",
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || ""
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isClosed(): boolean {
    return this.closed;
  }

  public async init(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
          resolve();
    });

    // In loki DB implementation, these operations are all sync. Doesn't need an async lock

    // Create service properties collection if not exists

    this.initialized = true;
    this.closed = false;
  }

  /**
   * Close loki DB.
   *
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      resolve();
    });

    this.closed = true;
  }

  /**
   * Clean LokiBlobMetadataStore.
   *
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async clean(): Promise<void> {
      return;
  }

  public iteratorExtents(): AsyncIterator<string[]> {
    return new BlobReferredExtentsAsyncIterator(this);
  }

  public getS3Client(): S3Client {
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

  /**
   * Update blob service properties. Create service properties if not exists in persistency layer.
   *
   * TODO: Account's service property should be created when storage account is created or metadata
   * storage initialization. This method should only be responsible for updating existing record.
   * In this way, we can reduce one I/O call to get account properties.
   *
   * @param {ServicePropertiesModel} serviceProperties
   * @returns {Promise<ServicePropertiesModel>} undefined properties will be ignored during properties setup
   * @memberof LokiBlobMetadataStore
   */
  public async setServiceProperties(
    context: Context,
    serviceProperties: ServicePropertiesModel
  ): Promise<ServicePropertiesModel> {
    throw new NotImplementedError("setServiceProperties is not implemented.");
  }

  /**
   * Get service properties for specific storage account.
   *
   * @param {string} account
   * @returns {Promise<ServicePropertiesModel | undefined>}
   * @memberof LokiBlobMetadataStore
   */
  public async getServiceProperties(
    context: Context,
    account: string
  ): Promise<ServicePropertiesModel | undefined> {
    throw new NotImplementedError("getServiceProperties is not implemented.");
  }

  /**
   * List containers with query conditions specified.
   *
   * @param {string} account
   * @param {string} [prefix=""]
   * @param {number} [maxResults=5000]
   * @param {string} [marker=""]
   * @returns {(Promise<[ContainerModel[], string | undefined]>)}
   * @memberof LokiBlobMetadataStore
   */
  public async listContainers(
    context: Context,
    account: string,
    prefix: string = "",
    maxResults: number = DEFAULT_LIST_CONTAINERS_MAX_RESULTS,
    marker: string = ""
  ): Promise<[ContainerModel[], string | undefined]> {
    // const params = {
    //   Prefix: prefix,
    //   MaxKeys: maxResults,
    //   Marker: marker
    // };

    const s3 = this.getS3Client();
    const command = new ListBucketsCommand({});
    const data: ListBucketsCommandOutput = await s3.send(command);

    // Filter buckets by prefix and marker
    let buckets = data.Buckets?.filter(bucket => bucket.Name?.startsWith(prefix)) || [];
    if (marker) {
      buckets = buckets.filter(bucket => bucket.Name! > marker);
    }

    // Sort buckets by name
    buckets.sort((a, b) => a.Name!.localeCompare(b.Name!));

    // Limit the number of results
    const limitedBuckets = buckets.slice(0, maxResults + 1);

    // Determine the next marker
    const nextMarker = limitedBuckets.length > maxResults ? limitedBuckets[maxResults - 1].Name : undefined;

    // Map buckets to ContainerModel
    const containerModels: ContainerModel[] = limitedBuckets.map(bucket => ({
      accountName: account,
      name: bucket.Name!,
      properties: {
        lastModified: bucket.CreationDate!,
        etag: newEtag(),
      }
    }));

    return [containerModels, nextMarker];
  }

  public async listBlobs(
    context: Context,
    account: string,
    container: string,
    delimiter?: string,
    blob?: string,
    prefix: string = "",
    maxResults: number = DEFAULT_LIST_BLOBS_MAX_RESULTS,
    marker: string = "",
    includeSnapshots?: boolean,
    includeUncommittedBlobs?: boolean
  ): Promise<[BlobModel[], BlobPrefixModel[], string | undefined]> {
    const command = new ListObjectsV2Command({
      Bucket: container,
      Prefix: prefix,
      Delimiter: delimiter,
      MaxKeys: maxResults,
      ContinuationToken: marker
    });

    const s3 = this.getS3Client();
    const data: ListObjectsV2CommandOutput = await s3.send(command);

    const blobItems: BlobModel[] = data.Contents?.map(item => ({
      accountName: item.Owner?.DisplayName || "some-owner",
      containerName: container,
      name: item.Key!,
      isCommitted: true,
      properties: {
        lastModified: item.LastModified!,
        etag: item.ETag!,
        contentLength: item.Size!
      }
    })) || [];

    const blobPrefixes: BlobPrefixModel[] = data.CommonPrefixes?.map(prefix => ({
      name: prefix.Prefix!
    })) || [];

    const nextMarker = data.IsTruncated ? data.NextContinuationToken : undefined;

    return [blobItems, blobPrefixes, nextMarker];
  }

  public async listAllBlobs(
    maxResults: number = DEFAULT_LIST_BLOBS_MAX_RESULTS,
    marker: string = "",
    includeSnapshots?: boolean,
    includeUncommittedBlobs?: boolean
  ): Promise<[BlobModel[], string | undefined]> {
    const command = new ListObjectsV2Command({
      Bucket: 'tester', // Replace with your bucket name
      MaxKeys: maxResults,
      ContinuationToken: marker
    });

    const s3 = this.getS3Client();
    const data: ListObjectsV2CommandOutput = await s3.send(command);
    console.log(`ListAllBlobs: ${JSON.stringify(data)}`);
    const blobItems: BlobModel[] = data.Contents?.map(item => ({
      accountName: item.Owner?.DisplayName || "",
      containerName: 'bucket',
      name: item.Key!,
      isCommitted: true,
      properties: {
        lastModified: item.LastModified!,
        etag: item.ETag!,
        contentLength: item.Size!
      }
    })) || [];

    const nextMarker = data.IsTruncated ? data.NextContinuationToken : undefined;

    return [blobItems, nextMarker];
  }

  public async listUncommittedBlockPersistencyChunks(
    marker: string = "-1",
    maxResults: number = 2000
  ): Promise<[IExtentChunk[], string | undefined]> {
    // Assuming uncommitted blocks are stored with a specific prefix
    // const prefix = "uncommitted-blocks/";

    const command = new ListObjectsV2Command({
      Bucket: 'tester', // Replace with your bucket name
      // Prefix: prefix,
      MaxKeys: maxResults,
      ContinuationToken: marker
    });

    const s3 = this.getS3Client();
    const data: ListObjectsV2CommandOutput = await s3.send(command);

    const chunks: IExtentChunk[] = data.Contents?.map(item => ({
      id: item.Key!,
      offset: 0, // Assuming offset is 0 for simplicity
      count: item.Size! // Using the size of the object as the count
    })) || [];

    const nextMarker = data.IsTruncated ? data.NextContinuationToken : undefined;

    return [chunks, nextMarker];
  }


  /**
   * Gets a blob item from persistency layer by container name and blob name.
   * Will return block list or page list as well for downloading.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot=""]
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<BlobModel>}
   * @memberof LokiBlobMetadataStore
   */
  public async downloadBlob(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string = "",
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<BlobModel> {
    const s3 = this.getS3Client();

    try {
      const command = new GetObjectCommand({
        Bucket: container,
        Key: blob
      });

      const data: GetObjectCommandOutput = await s3.send(command);

      return {
        accountName: account,
        containerName: container,
        name: blob,
        isCommitted: true,
        properties: {
          lastModified: data.LastModified!,
          etag: data.ETag!,
          contentLength: data.ContentLength!,
          contentType: data.ContentType!,
          blobType: Models.BlobType.BlockBlob,
        },
        metadata: data.Metadata,
        persistency: {
          id: container + "/" + blob!,
          offset: 0, // Assuming offset is 0 for simplicity
          count: data.ContentLength! // Using the size of the object as the count
        }
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw StorageErrorFactory.getBlobNotFound(context.contextId);
      }
      throw error;
    }
  }

  /**
   * Gets a blob item from persistency layer by container name and blob name.
   * Will return block list or page list as well for downloading.
   *
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot]
   * @returns {(Promise<BlobModel | undefined>)}
   * @memberof LokiBlobMetadataStore
   */
  public async getBlob(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string = ""
  ): Promise<BlobModel | undefined> {
    const s3 = this.getS3Client();

    try {
      const command = new HeadObjectCommand({
        Bucket: container,
        Key: blob
      });

      const data: HeadObjectCommandOutput = await s3.send(command);

      return {
        accountName: account,
        containerName: container,
        name: blob,
        isCommitted: true,
        properties: {
          lastModified: data.LastModified!,
          etag: data.ETag!,
          contentLength: data.ContentLength!,
          contentType: data.ContentType!,
        },
        metadata: data.Metadata
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Create a container.
   *
   * @param {ContainerModel} container
   * @returns {Promise<ContainerModel>}
   * @memberof LokiBlobMetadataStore
   */
  public async createContainer(
    context: Context,
    container: ContainerModel
  ): Promise<ContainerModel> {
    throw new NotImplementedError("createContainer is not implemented.");
  }

  /**
   * Get container properties.
   *
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @returns {Promise<GetContainerPropertiesResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async getContainerProperties(
    context: Context,
    account: string,
    container: string,
    leaseAccessConditions?: Models.LeaseAccessConditions
  ): Promise<GetContainerPropertiesResponse> {
    throw new NotImplementedError("getContainerProperties is not implemented.");
  }

  /**
   * Delete container item if exists from persistency layer.
   *
   * Loki based implementation will delete container documents from Containers collection,
   * blob documents from Blobs collection, and blocks documents from Blocks collection immediately.
   *
   * Persisted extents data will be deleted by GC.
   *
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {Models.ContainerDeleteMethodOptionalParams} [options]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async deleteContainer(
    context: Context,
    account: string,
    container: string,
    options: Models.ContainerDeleteMethodOptionalParams = {}
  ): Promise<void> {
    throw new NotImplementedError("deleteContainer is not implemented.");
  }

  /**
   * Set container metadata.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {Date} lastModified
   * @param {string} etag
   * @param {IContainerMetadata} [metadata]
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async setContainerMetadata(
    context: Context,
    account: string,
    container: string,
    lastModified: Date,
    etag: string,
    metadata?: IContainerMetadata,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<void> {
    throw new NotImplementedError("setContainerMetadata is not implemented.");
  }

  /**
   * Get container access policy.
   *
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @returns {Promise<GetContainerAccessPolicyResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async getContainerACL(
    context: Context,
    account: string,
    container: string,
    leaseAccessConditions?: Models.LeaseAccessConditions
  ): Promise<GetContainerAccessPolicyResponse> {
    throw new NotImplementedError("getContainerACL is not implemented.");
  }

  /**
   * Set container access policy.
   *
   * @param {string} account
   * @param {string} container
   * @param {SetContainerAccessPolicyOptions} setAclModel
   * @param {Context} context
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async setContainerACL(
    context: Context,
    account: string,
    container: string,
    setAclModel: SetContainerAccessPolicyOptions
  ): Promise<void> {
    throw new NotImplementedError("setContainerACL is not implemented.");
  }

  /**
   * Acquire container lease.
   *
   * @param {string} account
   * @param {string} container
   * @param {Models.ContainerAcquireLeaseOptionalParams} options
   * @param {Context} context
   * @returns {Promise<AcquireContainerLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async acquireContainerLease(
    context: Context,
    account: string,
    container: string,
    options: Models.ContainerAcquireLeaseOptionalParams
  ): Promise<AcquireContainerLeaseResponse> {
    throw new NotImplementedError("acquireContainerLease is not implemented.");
  }

  /**
   * Release container lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} leaseId
   * @param {Models.ContainerReleaseLeaseOptionalParams} [options={}]
   * @returns {Promise<ReleaseContainerLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async releaseContainerLease(
    context: Context,
    account: string,
    container: string,
    leaseId: string,
    options: Models.ContainerReleaseLeaseOptionalParams = {}
  ): Promise<ReleaseContainerLeaseResponse> {
    throw new NotImplementedError("releaseContainerLease is not implemented.");
  }

  /**
   * Renew container lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} leaseId
   * @param {Models.ContainerRenewLeaseOptionalParams} [options={}]
   * @returns {Promise<RenewContainerLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async renewContainerLease(
    context: Context,
    account: string,
    container: string,
    leaseId: string,
    options: Models.ContainerRenewLeaseOptionalParams = {}
  ): Promise<RenewContainerLeaseResponse> {
    throw new NotImplementedError("renewContainerLease is not implemented.");
  }

  /**
   * Break container lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {(number | undefined)} breakPeriod
   * @param {Models.ContainerBreakLeaseOptionalParams} [options={}]
   * @returns {Promise<BreakContainerLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async breakContainerLease(
    context: Context,
    account: string,
    container: string,
    breakPeriod: number | undefined,
    options: Models.ContainerBreakLeaseOptionalParams = {}
  ): Promise<BreakContainerLeaseResponse> {
    throw new NotImplementedError("breakContainerLease is not implemented.");
  }

  /**
   * Change container lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} leaseId
   * @param {string} proposedLeaseId
   * @param {Models.ContainerChangeLeaseOptionalParams} [options={}]
   * @returns {Promise<ChangeContainerLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async changeContainerLease(
    context: Context,
    account: string,
    container: string,
    leaseId: string,
    proposedLeaseId: string,
    options: Models.ContainerChangeLeaseOptionalParams = {}
  ): Promise<ChangeContainerLeaseResponse> {
    throw new NotImplementedError("changeContainerLease is not implemented.");
  }

  /**
   * Check the existence of a container.
   *
   * @param {string} account
   * @param {string} container
   * @param {Context} [context]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async checkContainerExist(
    context: Context,
    account: string,
    container: string
  ): Promise<void> {
    const s3 = this.getS3Client();

    try {
      const command = new HeadBucketCommand({
        Bucket: container
      });

      await s3.send(command);
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw StorageErrorFactory.getContainerNotFound(context.contextId);
      }
      throw error;
    }
  }

  /**
   * Create blob item in persistency layer. Will replace if blob exists.
   *
   * @param {Context} context
   * @param {BlobModel} blob
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async createBlob(
    context: Context,
    blob: BlobModel,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<void> {
    throw new NotImplementedError("createBlob is not implemented.");
  }

  /**
   * Create snapshot.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions] Optional. Will validate lease if provided
   * @returns {Promise<CreateSnapshotResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async createSnapshot(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    metadata?: Models.BlobMetadata,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<CreateSnapshotResponse> {
    throw new NotImplementedError("createSnapshot is not implemented.");
  }

  /**
   * Get blob properties.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot=""]
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<GetBlobPropertiesRes>}
   * @memberof LokiBlobMetadataStore
   */
  public async getBlobProperties(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string = "",
    leaseAccessConditions: Models.LeaseAccessConditions | undefined,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<GetBlobPropertiesRes> {
    const s3 = this.getS3Client();

    try {
      const command = new HeadObjectCommand({
        Bucket: container,
        Key: blob
      });

      const data: HeadObjectCommandOutput = await s3.send(command);

      const properties: Models.BlobPropertiesInternal = {
        lastModified: data.LastModified!,
        etag: data.ETag!,
        contentLength: data.ContentLength!,
        contentType: data.ContentType!,
        // Add other properties if needed
      };

      return {
        properties,
        metadata: data.Metadata,
        blobCommittedBlockCount: undefined // Adjust this if you have block blob specific logic
      };
    } catch (error) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw StorageErrorFactory.getBlobNotFound(context.contextId);
      }
      throw error;
    }
  }

  /**
   * Delete blob or its snapshots.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {Models.BlobDeleteMethodOptionalParams} options
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async deleteBlob(
    context: Context,
    account: string,
    container: string,
    blob: string,
    options: Models.BlobDeleteMethodOptionalParams
  ): Promise<void> {
    throw new NotImplementedError("deleteBlob is not implemented.");
  }

  /**
   * Set blob HTTP headers.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @param {(Models.BlobHTTPHeaders | undefined)} blobHTTPHeaders
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async setBlobHTTPHeaders(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseAccessConditions: Models.LeaseAccessConditions | undefined,
    blobHTTPHeaders: Models.BlobHTTPHeaders | undefined,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("setBlobHTTPHeaders is not implemented.");
  }

  /**
   * Set blob metadata.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @param {(Models.BlobMetadata | undefined)} metadata
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async setBlobMetadata(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseAccessConditions: Models.LeaseAccessConditions | undefined,
    metadata: Models.BlobMetadata | undefined,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("setBlobMetadata is not implemented.");
  }

  /**
   * Acquire blob lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {number} duration
   * @param {string} [proposedLeaseId]
   * @param {Models.BlobAcquireLeaseOptionalParams} [options={}]
   * @returns {Promise<AcquireBlobLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async acquireBlobLease(
    context: Context,
    account: string,
    container: string,
    blob: string,
    duration: number,
    proposedLeaseId?: string,
    options: Models.BlobAcquireLeaseOptionalParams = {}
  ): Promise<AcquireBlobLeaseResponse> {
    throw new NotImplementedError("acquireBlobLease is not implemented.");
  }

  /**
   * Release blob.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} leaseId
   * @param {Models.BlobReleaseLeaseOptionalParams} [options={}]
   * @returns {Promise<ReleaseBlobLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async releaseBlobLease(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseId: string,
    options: Models.BlobReleaseLeaseOptionalParams = {}
  ): Promise<ReleaseBlobLeaseResponse> {
    throw new NotImplementedError("releaseBlobLease is not implemented.");
  }

  /**
   * Renew blob lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} leaseId
   * @param {Models.BlobRenewLeaseOptionalParams} [options={}]
   * @returns {Promise<RenewBlobLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async renewBlobLease(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseId: string,
    options: Models.BlobRenewLeaseOptionalParams = {}
  ): Promise<RenewBlobLeaseResponse> {
    throw new NotImplementedError("renewBlobLease is not implemented.");
  }

  /**
   * Change blob lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} leaseId
   * @param {string} proposedLeaseId
   * @param {Models.BlobChangeLeaseOptionalParams} [option={}]
   * @returns {Promise<ChangeBlobLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async changeBlobLease(
    context: Context,
    account: string,
    container: string,
    blob: string,
    leaseId: string,
    proposedLeaseId: string,
    options: Models.BlobChangeLeaseOptionalParams = {}
  ): Promise<ChangeBlobLeaseResponse> {
    throw new NotImplementedError("changeBlobLease is not implemented.");
  }

  /**
   * Break blob lease.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(number | undefined)} breakPeriod
   * @param {Models.BlobBreakLeaseOptionalParams} [options={}]
   * @returns {Promise<BreakBlobLeaseResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async breakBlobLease(
    context: Context,
    account: string,
    container: string,
    blob: string,
    breakPeriod: number | undefined,
    options: Models.BlobBreakLeaseOptionalParams = {}
  ): Promise<BreakBlobLeaseResponse> {
    throw new NotImplementedError("breakBlobLease is not implemented.");
  }

  /**
   * Check the existence of a blob.
   *
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot=""]
   * @param {Context} [context]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async checkBlobExist(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string = ""
  ): Promise<void> {
    throw new NotImplementedError("checkBlobExist is not implemented.");
  }

  /**
   * Get blobType and committed status for SAS authentication.
   *
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot=""]
   * @returns {(Promise<
   *     { blobType: Models.BlobType | undefined; isCommitted: boolean } | undefined
   *   >)}
   * @memberof LokiBlobMetadataStore
   */
  public async getBlobType(
    account: string,
    container: string,
    blob: string,
    snapshot: string = ""
  ): Promise<
    { blobType: Models.BlobType | undefined; isCommitted: boolean } | undefined
  > {
    throw new NotImplementedError("getBlobType is not implemented.");
  }

  /**
   * Start copy from Url.
   *
   * @param {Context} context
   * @param {BlobId} source
   * @param {BlobId} destination
   * @param {string} copySource
   * @param {(Models.BlobMetadata | undefined)} metadata
   * @param {(Models.AccessTier | undefined)} tier
   * @param {Models.BlobStartCopyFromURLOptionalParams} [leaseAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async startCopyFromURL(
    context: Context,
    source: BlobId,
    destination: BlobId,
    copySource: string,
    metadata: Models.BlobMetadata | undefined,
    tier: Models.AccessTier | undefined,
    options: Models.BlobStartCopyFromURLOptionalParams = {}
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("startCopyFromURL is not implemented.");
  }

  /**
   * Copy from Url.
   *
   * @param {Context} context
   * @param {BlobId} source
   * @param {BlobId} destination
   * @param {string} copySource
   * @param {(Models.BlobMetadata | undefined)} metadata
   * @param {(Models.AccessTier | undefined)} tier
   * @param {Models.BlobCopyFromURLOptionalParams} [leaseAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async copyFromURL(
    context: Context,
    source: BlobId,
    destination: BlobId,
    copySource: string,
    metadata: Models.BlobMetadata | undefined,
    tier: Models.AccessTier | undefined,
    options: Models.BlobCopyFromURLOptionalParams = {}
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("copyFromURL is not implemented.");
  }

  /**
   * Update Tier for a blob.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {Models.AccessTier} tier
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @returns {(Promise<200 | 202>)}
   * @memberof LokiBlobMetadataStore
   */
  public async setTier(
    context: Context,
    account: string,
    container: string,
    blob: string,
    tier: Models.AccessTier,
    leaseAccessConditions: Models.LeaseAccessConditions | undefined
  ): Promise<200 | 202> {
    throw new NotImplementedError("setTier is not implemented.");
  }

  /**
   * Update blob block item in persistency layer. Will create if block doesn't exist.
   * Will also create a uncommitted block blob.
   *
   * @param {BlockModel} block
   * @param {Context} context
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async stageBlock(
    context: Context,
    block: BlockModel,
    leaseAccessConditions?: Models.LeaseAccessConditions
  ): Promise<void> {
    throw new NotImplementedError("stageBlock is not implemented.");
  }

  public async appendBlock(
    context: Context,
    block: BlockModel,
    leaseAccessConditions: Models.LeaseAccessConditions = {},
    modifiedAccessConditions: Models.ModifiedAccessConditions = {},
    appendPositionAccessConditions: Models.AppendPositionAccessConditions = {}
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("appendBlock is not implemented.");
  }

  /**
   * Commit block list for a blob.
   *
   * @param {Context} context
   * @param {BlobModel} blob
   * @param {{ blockName: string; blockCommitType: string }[]} blockList
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async commitBlockList(
    context: Context,
    blob: BlobModel,
    blockList: { blockName: string; blockCommitType: string }[],
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<void> {
    throw new NotImplementedError("commitBlockList is not implemented.");
  }

  /**
   * Gets blocks list for a blob from persistency layer by account, container and blob names.
   *
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(string | undefined)} snapshot
   * @param {(boolean | undefined)} isCommitted
   * @param {Context} context
   * @returns {Promise<{
   *     properties: Models.BlobProperties;
   *     uncommittedBlocks: Models.Block[];
   *     committedBlocks: Models.Block[];
   *   }>}
   * @memberof LokiBlobMetadataStore
   */
  public async getBlockList(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string | undefined,
    isCommitted: boolean | undefined,
    leaseAccessConditions: Models.LeaseAccessConditions | undefined
  ): Promise<{
    properties: Models.BlobPropertiesInternal;
    uncommittedBlocks: Models.Block[];
    committedBlocks: Models.Block[];
  }> {
    throw new NotImplementedError("getBlockList is not implemented.");
  }

  /**
   * Upload new pages for page blob.
   *
   * @param {Context} context
   * @param {BlobModel} blob
   * @param {number} start
   * @param {number} end
   * @param {IExtentChunk} persistency
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @param {Models.SequenceNumberAccessConditions} [sequenceNumberAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async uploadPages(
    context: Context,
    blob: BlobModel,
    start: number,
    end: number,
    persistency: IExtentChunk,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions,
    sequenceNumberAccessConditions?: Models.SequenceNumberAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("uploadPages is not implemented.");
  }

  /**
   * Clear range for a page blob.
   *
   * @param {Context} context
   * @param {BlobModel} blob
   * @param {number} start
   * @param {number} end
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @param {Models.SequenceNumberAccessConditions} [sequenceNumberAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async clearRange(
    context: Context,
    blob: BlobModel,
    start: number,
    end: number,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions,
    sequenceNumberAccessConditions?: Models.SequenceNumberAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("clearRange is not implemented.");
  }

  /**
   * Returns the list of valid page ranges for a page blob or snapshot of a page blob.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {string} [snapshot]
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<GetPageRangeResponse>}
   * @memberof LokiBlobMetadataStore
   */
  public async getPageRanges(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot?: string,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<GetPageRangeResponse> {
    throw new NotImplementedError("getPageRanges is not implemented.");
  }

  /**
   * Resize a page blob.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {number} blobContentLength
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async resizePageBlob(
    context: Context,
    account: string,
    container: string,
    blob: string,
    blobContentLength: number,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("resizePageBlob is not implemented.");
  }

  /**
   * Update the sequence number of a page blob.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {Models.SequenceNumberActionType} sequenceNumberAction
   * @param {(number | undefined)} blobSequenceNumber
   * @param {Models.LeaseAccessConditions} [leaseAccessConditions]
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<Models.BlobProperties>}
   * @memberof LokiBlobMetadataStore
   */
  public async updateSequenceNumber(
    context: Context,
    account: string,
    container: string,
    blob: string,
    sequenceNumberAction: Models.SequenceNumberActionType,
    blobSequenceNumber: number | undefined,
    leaseAccessConditions?: Models.LeaseAccessConditions,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<Models.BlobPropertiesInternal> {
    throw new NotImplementedError("updateSequenceNumber is not implemented.");
  }

  /**
   * LokiJS will persist Uint8Array into Object.
   * This method will restore object to Uint8Array.
   *
   * @private
   * @param {*} obj
   * @returns {(Uint8Array | undefined)}
   * @memberof LokiBlobMetadataStore
   */
  // private restoreUint8Array(obj: any): Uint8Array | undefined {
  //   if (typeof obj !== "object") {
  //     return undefined;
  //   }

  //   if (obj instanceof Uint8Array) {
  //     return obj;
  //   }

  //   if (obj.type === "Buffer") {
  //     obj = obj.data;
  //   }

  //   const length = Object.keys(obj).length;
  //   const arr = Buffer.allocUnsafe(length);

  //   for (let i = 0; i < length; i++) {
  //     if (!obj.hasOwnProperty(i)) {
  //       throw new TypeError(
  //         `Cannot restore loki DB persisted object to Uint8Array. Key ${i} is missing.`
  //       );
  //     }

  //     arr[i] = obj[i];
  //   }

  //   return arr;
  // }

  /**
   * Escape a string to be used as a regex.
   *
   * @private
   * @param {string} regex
   * @returns {string}
   * @memberof LokiBlobMetadataStore
   */
  // private escapeRegex(regex: string): string {
  //   return regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  // }

  /**
   * Get a container document from container collection.
   * Updated lease related properties according to current time.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @returns {Promise<ContainerModel>}
   * @memberof LokiBlobMetadataStore
   */

  /**
   * Get a container document from container collection.
   * Updated lease related properties according to current time.
   * Will throw ContainerNotFound storage error if container doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @returns {Promise<ContainerModel>}
   * @memberof LokiBlobMetadataStore
   */
  // private async getContainerWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist?: true
  // ): Promise<ContainerModel>;

  /**
   * Get a container document from container collection.
   * Updated lease related properties according to current time.
   * Will NOT throw ContainerNotFound storage error if container doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {false} forceExist
   * @returns {(Promise<ContainerModel | undefined>)}
   * @memberof LokiBlobMetadataStore
   */
  // private async getContainerWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist: false
  // ): Promise<ContainerModel | undefined>;

  // private async getContainerWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist?: boolean
  // ): Promise<ContainerModel | undefined> {
  //   const coll = this.db.getCollection(this.CONTAINERS_COLLECTION);
  //   const doc = coll.findOne({ accountName: account, name: container });

  //   if (forceExist === undefined || forceExist === true) {
  //     if (!doc) {
  //       throw StorageErrorFactory.getContainerNotFound(context.contextId);
  //     }
  //   }

  //   if (!doc) {
  //     return undefined;
  //   }

  //   LeaseFactory.createLeaseState(new ContainerLeaseAdapter(doc), context).sync(
  //     new ContainerLeaseSyncer(doc)
  //   );

  //   return doc;
  // }

  /**
   * Get a container document from Loki collections.
   * Will throw ContainerNotFound error when container doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {true} [forceExist]
   * @returns {Promise<ContainerModel>}
   * @memberof LokiBlobMetadataStore
   */
  // private async getContainer(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist?: true
  // ): Promise<ContainerModel>;

  /**
   * Get a container document from Loki collections.
   * Will NOT throw ContainerNotFound error when container doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {Context} context
   * @param {false} forceExist
   * @returns {Promise<ContainerModel>}
   * @memberof LokiBlobMetadataStore
   */
  // private async getContainer(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist: false
  // ): Promise<ContainerModel | undefined>;

  // private async getContainer(
  //   account: string,
  //   container: string,
  //   context: Context,
  //   forceExist?: boolean
  // ): Promise<ContainerModel | undefined> {
  //   const coll = this.db.getCollection(this.CONTAINERS_COLLECTION);
  //   const doc = coll.findOne({ accountName: account, name: container });

  //   if (!doc) {
  //     if (forceExist) {
  //       throw StorageErrorFactory.getContainerNotFound(context.contextId);
  //     } else {
  //       return undefined;
  //     }
  //   }

  //   return doc;
  // }

  /**
   * Get a blob document model from Loki collection.
   * Will throw BlobNotFound storage error if blob doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(string | undefined)} snapshot
   * @param {Context} context
   * @param {undefined} [forceExist]
   * @param {boolean} [forceCommitted] If true, will take uncommitted blob as a non-exist blob and throw exception.
   * @returns {Promise<BlobModel>}
   * @memberof LokiBlobMetadataStore
   */
  // private async getBlobWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   blob: string,
  //   snapshot: string | undefined,
  //   context: Context,
  //   forceExist?: true,
  //   forceCommitted?: boolean
  // ): Promise<BlobModel>;

  /**
   * Get a blob document model from Loki collection.
   * Will NOT throw BlobNotFound storage error if blob doesn't exist.
   *
   * @private
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(string | undefined)} snapshot
   * @param {Context} context
   * @param {false} forceExist
   * @param {boolean} [forceCommitted] If true, will take uncommitted blob as a non-exist blob and return undefined.
   * @returns {(Promise<BlobModel | undefined>)}
   * @memberof LokiBlobMetadataStore
   */
  // private async getBlobWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   blob: string,
  //   snapshot: string | undefined,
  //   context: Context,
  //   forceExist: false,
  //   forceCommitted?: boolean
  // ): Promise<BlobModel | undefined>;

  // private async getBlobWithLeaseUpdated(
  //   account: string,
  //   container: string,
  //   blob: string,
  //   snapshot: string = "",
  //   context: Context,
  //   forceExist?: boolean,
  //   forceCommitted?: boolean
  // ): Promise<BlobModel | undefined> {
  //   throw new NotImplementedError("getBlobWithLeaseUpdated is not implemented.");
  // }

  /**
   * Set blob tags.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(string | undefined)} snapshot
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @param {(Models.BlobTags | undefined)} tags
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<void>}
   * @memberof LokiBlobMetadataStore
   */
  public async setBlobTag(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string | undefined,
    leaseAccessConditions: Models.LeaseAccessConditions | undefined,
    tags: Models.BlobTags | undefined,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<void> {
    throw new NotImplementedError("setBlobTag is not implemented.");
  }

  /**
   * Get blob tags.
   *
   * @param {Context} context
   * @param {string} account
   * @param {string} container
   * @param {string} blob
   * @param {(string | undefined)} snapshot
   * @param {(Models.LeaseAccessConditions | undefined)} leaseAccessConditions
   * @param {Models.ModifiedAccessConditions} [modifiedAccessConditions]
   * @returns {Promise<BlobTags | undefined>}
   * @memberof LokiBlobMetadataStore
   */
  public async getBlobTag(
    context: Context,
    account: string,
    container: string,
    blob: string,
    snapshot: string = "",
    leaseAccessConditions: Models.LeaseAccessConditions | undefined,
    modifiedAccessConditions?: Models.ModifiedAccessConditions
  ): Promise<Models.BlobTags | undefined> {
    throw new NotImplementedError("getBlobTag is not implemented.");
  }

  /**
   * Get the tier setting from request headers.
   *
   * @private
   * @param {string} tier
   * @returns {(Models.AccessTier | undefined)}
   * @memberof BlobHandler
   */
  // private parseTier(tier: string): Models.AccessTier | undefined {
  //   tier = tier.toLowerCase();
  //   if (tier === Models.AccessTier.Hot.toLowerCase()) {
  //     return Models.AccessTier.Hot;
  //   }
  //   if (tier === Models.AccessTier.Cool.toLowerCase()) {
  //     return Models.AccessTier.Cool;
  //   }
  //   if (tier === Models.AccessTier.Archive.toLowerCase()) {
  //     return Models.AccessTier.Archive;
  //   }
  //   if (tier === Models.AccessTier.Cold.toLowerCase()) {
  //     return Models.AccessTier.Cold;
  //   }
  //   return undefined;
  // }
}
