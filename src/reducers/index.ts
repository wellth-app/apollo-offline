import { Reducer, AnyAction } from "redux";
import { IdGetter } from "apollo-cache-inmemory";
import rehydrated from "./rehydrated";
import cache from "./cache";
import { offlineEffectConfig as mutationsConfig } from "../links/offline";
import { NORMALIZED_CACHE_KEY, METADATA_KEY } from "../cache";

export declare type OfflineEffectConfig = {
  enqueueAction: string;
  effect?: Function;
  discard?: Function;
  retry?: Function;
  reducer?: (dataIdFromObject: IdGetter) => Reducer<any>;
};

declare type OfflineEffectConfigMap = {
  [key: string]: OfflineEffectConfig;
};

const offlineEffectsConfigs = [mutationsConfig]
  .filter(Boolean)
  .reduce((config, { enqueueAction, ...rest }) => {
    config[enqueueAction] = { enqueueAction, ...rest };
    return config;
  }, {}) as OfflineEffectConfigMap;

export interface Options {
  dataIdFromObject: IdGetter;
}

export default ({ dataIdFromObject }: Options) => ({
  rehydrated,
  [NORMALIZED_CACHE_KEY]: cache,
  [METADATA_KEY]: (state, action: AnyAction) =>
    Object.entries(offlineEffectsConfigs).reduce(
      (effectState, [, { reducer = () => (x) => x }]) =>
        reducer(dataIdFromObject)(effectState, action),
      state,
    ),
});
