import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
  Middleware,
  Store,
} from "redux";
import { offline } from "@redux-offline/redux-offline";
import defaultOfflineConfig from "@redux-offline/redux-offline/lib/defaults";
import { OfflineAction, Config } from "@redux-offline/redux-offline/lib/types";
import thunk from "redux-thunk";
import reducers from "reducers";
import { rootLogger } from "utils";

const logger = rootLogger.extend("store");

export type NetworkEffect = (
  effect: any,
  action: OfflineAction,
) => Promise<any>;

export type Discard = (
  error: any,
  action: OfflineAction,
  retries: number,
) => boolean;

export interface Options extends Partial<Config> {
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
}: Options): Store<any> => {
  logger("Creating offline store");
  return createStore(
    combineReducers(reducers({ dataIdFromObject })),
    typeof window !== "undefined" &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
    compose(
      applyMiddleware(thunk, ...middleware),
      offline({
        ...defaultOfflineConfig,
        ...offlineConfig,
        persistCallback: () => {
          logger("Persistence loaded");
          persistCallback();
        },
        persistOptions: {
          blacklist: ["rehydrated"],
          whitelist: ["offline"],
          storage,
        },
      }),
    ),
  );
};
