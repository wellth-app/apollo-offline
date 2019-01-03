import {
  createStore,
  applyMiddleware,
  compose,
  combineReducers,
  Middleware,
} from "redux";
import { offline } from "@redux-offline/redux-offline";
import {
  OfflineAction,
  NetworkCallback,
} from "@redux-offline/redux-offline/lib/types";
import offlineConfig from "@redux-offline/redux-offline/lib/defaults";
import thunk from "redux-thunk";
import reducers from "../reducers";

export type NetworkEffect = (
  effect: any,
  action: OfflineAction,
) => Promise<any>;

export type Discard = (
  error: any,
  action: OfflineAction,
  retries: number,
) => boolean;

export interface Options {
  middleware: Middleware[];
  persistCallback: () => void;
  effect: NetworkEffect;
  discard: Discard;
  detectNetwork?: (callback: NetworkCallback) => void;
}

export const createOfflineStore = (options: Options) => {
  const {
    middleware,
    persistCallback,
    effect,
    discard,
    detectNetwork = offlineConfig.detectNetwork,
  } = options;
  const _middleware = [thunk, ...middleware];

  return createStore(
    combineReducers(reducers),
    typeof window !== "undefined" &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__ &&
      (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
    compose(
      applyMiddleware(..._middleware),
      offline({
        ...offlineConfig,
        persistCallback,
        persistOptions: {
          blacklist: ["rehydrated"],
        },
        effect,
        discard,
        detectNetwork,
      }),
    ),
  );
};
