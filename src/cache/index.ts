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

const logger = rootLogger.extend("offline-cache");

// !!!: Offline schema keys. Do not change in a non-backwards-compatible way
export const NORMALIZED_CACHE_KEY = "apollo-offline";
export const METADATA_KEY = "apollo-offline-metadata";

export { defaultDataIdFromObject };

const ROOT_MUTATION_DATA_ID = "ROOT_MUTATION";

// !!!: Offline schema. Do not change in a non-backwards-compatible way
export type OfflineSyncMetadataState = {
  idsMap: {
    [key: string]: string;
  };
  snapshot: {
    // cache: NormalizedCacheObject;
    enqueuedMutations: number;
  };
};

export interface OfflineCache {
  offline: OfflineState;
  rehydrated: boolean;
  [NORMALIZED_CACHE_KEY]: NormalizedCacheObject;
  [METADATA_KEY]: OfflineSyncMetadataState;
}

export type OfflineCacheOptions = {
  store: Store<OfflineCache>;
  storeCacheRootMutation?: boolean;
};

const isOfflineCacheOptions = (obj: any): obj is OfflineCacheOptions =>
  !!(obj as OfflineCacheOptions).store;

/// Class that extends the `apollo-inmemory-cache` to persist to the provided
/// `redux` store in the shape of `OfflineCache`.
export default class ApolloOfflineCache extends InMemoryCache {
  private store: Store<OfflineCache>;
  private storeCacheRootMutation: boolean = false;

  constructor(
    optionsOrStore: Store<OfflineCache> | OfflineCacheOptions,
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

  restore(data: NormalizedCacheObject) {
    // Write the data to the persistent cache
    boundWriteCache(this.store, data);

    // Restore the data to this cache and update observers
    super.restore(data);
    super.broadcastWatches();

    return this;
  }

  write(write: Cache.WriteOptions) {
    super.write(write);

    /// Delete the `ROOT_MUTATION` key from data if it was written
    if (
      !this.storeCacheRootMutation &&
      write.dataId === ROOT_MUTATION_DATA_ID
    ) {
      this.data.delete(ROOT_MUTATION_DATA_ID);
    }

    if (this.data && typeof (this.data as any).record === "undefined") {
      const data = super.extract(true);
      boundWriteCache(this.store, data);
    } else {
      logger("No dispatch for RecordingCache");
    }
  }

  reset() {
    logger("Resetting cache");
    boundWriteCache(this.store, {});
    return super.reset();
  }

  getIdsMap() {
    const {
      [METADATA_KEY]: { idsMap },
    } = this.store.getState();

    return { ...idsMap };
  }
}

const boundWriteCache = (
  store: Store<OfflineCache>,
  data: NormalizedCacheObject,
) => {
  logger(`Dispatching ${WRITE_CACHE_ACTION}`);
  store.dispatch((writeThunk(WRITE_CACHE_ACTION, data) as any) as Action);
};

type WriteThunk = (
  type: string,
  payload: any,
) => ThunkAction<Action, OfflineCache, null, AnyAction>;

const writeThunk: WriteThunk = (type, payload) => (dispatch, _getState) =>
  dispatch({
    type,
    payload,
  });
