import {
  createStore,
  applyMiddleware,
  combineReducers,
  Middleware,
  Store,
  AnyAction,
} from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { createOffline } from "@redux-offline/redux-offline";
import defaultOfflineConfig from "@redux-offline/redux-offline/lib/defaults";
import { Config, OfflineAction } from "@redux-offline/redux-offline/lib/types";
import thunk from "redux-thunk";
import { IdGetter } from "apollo-cache-inmemory";
import { OfflineCacheShape, OfflineSyncMetadataState } from "../cache";
import rehydrated from "../reducers/rehydrated";
import cacheReducer from "../reducers/cache";
import offlineEffectReducer from "../reducers/offlineEffect";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "../cache/constants";
import { rootLogger } from "../utils";

const logger = rootLogger.extend("store");

export interface ReducerOptions {
  dataIdFromObject: IdGetter;
}

type ReduxOfflineConfig = Omit<Config, "discard"> & {
  discard: (
    error: any,
    action: OfflineAction,
    retries: number,
  ) => Promise<boolean> | boolean;
};

export interface OfflineStoreOptions extends Partial<ReduxOfflineConfig> {
  // Middleware to be applied to the redux store.
  middleware: Middleware[];
  /// TODO: Figure out wtf AsyncStorage conforms to and do that
  storage?: any;
  dataIdFromObject: (obj: any) => string | null;
}

export const createOfflineStore = ({
  middleware,
  persistCallback,
  storage = undefined,
  dataIdFromObject,
  discard,
  ...offlineConfig
}: OfflineStoreOptions): Store<OfflineCacheShape> => {
  logger("Creating offline store");

  const {
    enhanceStore: offlineEnhanceStore,
    middleware: offlineMiddleware,
    enhanceReducer,
  } = createOffline({
    ...defaultOfflineConfig,
    ...offlineConfig,
    discard: discard as Config["discard"],
    persistCallback: () => {
      logger("Persistence loaded");
      persistCallback();
    },
    persistOptions: {
      ...(storage && { storage }),
      whitelist: ["offline", NORMALIZED_CACHE_KEY, METADATA_KEY],
    },
  });

  const reducer = combineReducers({
    rehydrated,
    [NORMALIZED_CACHE_KEY]: cacheReducer,
    [METADATA_KEY]: (state: OfflineSyncMetadataState, action: AnyAction) =>
      offlineEffectReducer(dataIdFromObject)(state, action),
  });

  const enhanceStore = composeWithDevTools({
    name: "@wellth/apollo-offline/store",
  });

  return createStore<OfflineCacheShape, AnyAction, any, any>(
    enhanceReducer(reducer),
    enhanceStore(
      applyMiddleware(thunk, offlineMiddleware, ...middleware),
      offlineEnhanceStore,
    ),
  );
};
