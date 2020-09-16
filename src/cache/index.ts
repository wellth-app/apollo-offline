import { Cache } from "apollo-cache";
import { Store, AnyAction, Action } from "redux";
import {
  InMemoryCache,
  ApolloReducerConfig,
  defaultDataIdFromObject,
  NormalizedCacheObject,
} from "apollo-cache-inmemory";
import { OfflineState } from "@redux-offline/redux-offline/lib/types";
import { ThunkAction } from "redux-thunk";
import { rootLogger } from "../utils";
import { WRITE_CACHE as WRITE_CACHE_ACTION } from "../actions/writeCache";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "./constants";

const logger = rootLogger.extend("offline-cache");

export { defaultDataIdFromObject };

const ROOT_MUTATION_DATA_ID = "ROOT_MUTATION";

// !!!: Offline schema. Do not change in a non-backwards-compatible way
export type OfflineSyncMetadataState = {
  idsMap: {
    [key: string]: string;
  };
  snapshot: {
    cache: NormalizedCacheObject;
    enqueuedMutations: number;
  };
};

export interface OfflineCacheShape {
  offline: OfflineState;
  rehydrated: boolean;
  [NORMALIZED_CACHE_KEY]: NormalizedCacheObject;
  [METADATA_KEY]: OfflineSyncMetadataState;
}

type OfflineStore = Store<OfflineCacheShape>;

type WriteThunk = (
  type: string,
  payload: any,
) => ThunkAction<Action, OfflineCacheShape, null, AnyAction>;

const writeThunk: WriteThunk = (type, payload) => (dispatch, _getState) =>
  dispatch({
    type,
    payload,
  });

const boundWriteCache = (store: OfflineStore, data: NormalizedCacheObject) => {
  logger(`Dispatching ${WRITE_CACHE_ACTION}`);
  store.dispatch((writeThunk(WRITE_CACHE_ACTION, data) as any) as Action);
};

export type OfflineCacheOptions = {
  store: OfflineStore;
  storeCacheRootMutation?: boolean;
};

const isOfflineCacheOptions = (obj: any): obj is OfflineCacheOptions =>
  !!(obj as OfflineCacheOptions).store;

/// Class that extends the `apollo-inmemory-cache` to persist to the provided
/// `redux` store in the shape of `OfflineCacheShape`.
export class ApolloOfflineCache extends InMemoryCache {
  private store: OfflineStore;

  private storeCacheRootMutation = false;

  constructor(
    optionsOrStore: OfflineStore | OfflineCacheOptions,
    config: ApolloReducerConfig = {},
  ) {
    super(config);

    if (isOfflineCacheOptions(optionsOrStore)) {
      const { store, storeCacheRootMutation = false } = optionsOrStore;
      this.store = store;
      this.storeCacheRootMutation = storeCacheRootMutation;
    } else {
      this.store = optionsOrStore;
    }

    const cancelSubscription = this.store.subscribe(() => {
      const {
        [NORMALIZED_CACHE_KEY]: normalizedCache = {},
        rehydrated = false,
      } = this.store.getState();
      super.restore({ ...normalizedCache });
      if (rehydrated) {
        logger("Rehydrated! Cancelling subscription...");
        cancelSubscription();
      }
    });
  }

  restore(data: NormalizedCacheObject): this {
    // Write the data to the persistent cache
    boundWriteCache(this.store, data);

    // Restore the data to this cache and update observers
    super.restore(data);
    super.broadcastWatches();

    return this;
  }

  write(write: Cache.WriteOptions): void {
    super.write(write);

    /// Delete the `ROOT_MUTATION` key from data if it was written
    if (
      !this.storeCacheRootMutation &&
      write.dataId === ROOT_MUTATION_DATA_ID
    ) {
      this.data.delete(ROOT_MUTATION_DATA_ID);
    }

    // Don't save optimistics/record transactions to the persisted cache
    if (this.data && typeof (this.data as any).record === "undefined") {
      const data = super.extract(true);
      boundWriteCache(this.store, data);
    } else {
      logger("No dispatch for RecordingCache");
    }
  }

  reset(): Promise<void> {
    logger("Resetting cache");
    boundWriteCache(this.store, {});
    return super.reset();
  }

  getIdsMap(): { [key: string]: string } {
    const {
      [METADATA_KEY]: { idsMap },
    } = this.store.getState();

    return { ...idsMap };
  }
}

export default ApolloOfflineCache;
