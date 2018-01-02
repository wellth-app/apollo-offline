/// @flow
import {
  createStore,
  applyMiddleware,
  compose,
  Store,
  Action,
  combineReducers,
  Middleware,
} from "redux";
import { offline } from "@redux-offline/redux-offline";
import type { OfflineAction } from "@redux-offline/redux-offline";
import offlineConfig from "@redux-offline/redux-offline/lib/defaults";
import thunk from "redux-thunk";
import reducers from "../reducers";

export type NetworkEffect = (effect: any, action: OfflineAction) => Promise<*>;
export type Discard = (
  error: any,
  action: OfflineAction,
  retries: number
) => boolean;

export type Options = {
  middleware: Middleware[],
  persistCallback: () => void,
  effect: NetworkEffect,
  discard: Discard,
};

export const createOfflineStore = (options: Options): Store => {
  const { middleware, persistCallback, effect, discard } = options;
  const _middleware = [thunk, ...middleware];

  return createStore(
    combineReducers(reducers),
    window.__REDUX_DEVTOOLS_EXTENSION__ &&
      window.__REDUX_DEVTOOLS_EXTENSION__(),
    compose(
      applyMiddleware(..._middleware),
      offline({
        ...offlineConfig,
        persistCallback,
        persistOptions: {
          blacklist: ["rehydrated", "eclipse"],
        },
        effect,
        discard,
      })
    )
  );
};
