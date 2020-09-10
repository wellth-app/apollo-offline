/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
  Middleware,
  Store,
  ReducersMapObject,
  AnyAction,
  StoreEnhancerStoreCreator,
} from "redux";
import { offline } from "@redux-offline/redux-offline";
import defaultOfflineConfig from "@redux-offline/redux-offline/lib/defaults";
import { Config } from "@redux-offline/redux-offline/lib/types";
import thunk from "redux-thunk";
import { OfflineCacheShape, OfflineSyncMetadataState } from "cache";
import rehydrated from "reducers/rehydrated";
import cacheReducer from "reducers/cache";
import offlineEffectReducer from "reducers/offlineEffect";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "cache/constants";
import { IdGetter } from "apollo-cache-inmemory";
import { rootLogger } from "../utils";

const logger = rootLogger.extend("store");

export interface ReducerOptions {
  dataIdFromObject: IdGetter;
}

const reducer: (options: ReducerOptions) => ReducersMapObject = ({
  dataIdFromObject,
}) => ({
  [METADATA_KEY]: (state: OfflineSyncMetadataState, action: AnyAction) => {
    return offlineEffectReducer(dataIdFromObject)(state, action);
  },
});

export interface OfflineStoreOptions extends Partial<Config> {
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
  ...offlineConfig
}: OfflineStoreOptions): Store<OfflineCacheShape> => {
  logger("Creating offline store");

  const store = createStore<OfflineCacheShape>(
    combineReducers({
      rehydrated,
      [NORMALIZED_CACHE_KEY]: cacheReducer,
      ...reducer({ dataIdFromObject }),
    }),
    typeof window !== "undefined" &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
    compose<StoreEnhancerStoreCreator<OfflineCacheShape>>(
      applyMiddleware(thunk, ...middleware),
      offline({
        ...defaultOfflineConfig,
        ...offlineConfig,
        persistCallback: () => {
          logger("Persistence loaded");
          persistCallback();
        },
        persistOptions: {
          ...(storage && { storage }),
          whitelist: ["offline", NORMALIZED_CACHE_KEY, METADATA_KEY],
        },
      }),
    ),
  );

  return store;
};
