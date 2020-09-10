import {
  ApolloLink,
  Operation,
  NextLink,
  Observable,
  GraphQLRequest,
  ExecutionResult,
  FetchResult,
} from "apollo-link";
import {
  getOperationDefinition,
  getMutationDefinition,
  resultKeyNameFromField,
} from "apollo-utilities";
import {
  FetchPolicy,
  MutationUpdaterFn,
  MutationQueryReducersMap,
} from "apollo-client";
import { RefetchQueryDescription } from "apollo-client/core/watchQueryOptions";
import {
  defaultNormalizedCacheFactory,
  StoreReader,
  NormalizedCacheObject,
} from "apollo-cache-inmemory";
import { Store as ReduxStore } from "redux";
import { FieldNode } from "graphql";
import { ApolloCache } from "apollo-cache";
import { IS_OPTIMISTIC_KEY } from "../utils/isOptimistic";
import { QUEUE_OPERATION } from "../actions/queueOperation";
import { QUEUE_OPERATION_COMMIT } from "../actions/queueOperationCommit";
import { QUEUE_OPERATION_ROLLBACK } from "../actions/queueOperationRollback";
import { SAVE_SERVER_ID } from "../actions/saveServerId";
import saveSnapshot, { SAVE_SNAPSHOT } from "../actions/saveSnapshot";
import { OfflineCacheShape } from "../cache";
import { METADATA_KEY, NORMALIZED_CACHE_KEY } from "../cache/constants";

// TODO: Do we use this anywhere?
export type DetectNetwork = () => boolean;

const OPERATION_TYPE_MUTATION = "mutation";
const OPERATION_TYPE_QUERY = "query";

const actions = {
  SAVE_SNAPSHOT,
  ENQUEUE: QUEUE_OPERATION,
  COMMIT: QUEUE_OPERATION_COMMIT,
  ROLLBACK: QUEUE_OPERATION_ROLLBACK,
  SAVE_SERVER_ID,
};

// !!!: This is to remove the context that is added by the queryManager before a request.
// !!!: Because the request is processed by the queryManager before it gets to the `OfflineLink`,
//      context needs to be trimmed to protect against runaway storage but preserve functionality
//      for links dependent upon context between `OfflineLink` and network execution.
const APOLLO_PRIVATE_CONTEXT_KEYS = ["cache", "getCacheKey", "clientAwareness"];

export interface CacheUpdates {
  [key: string]: (context: any) => MutationUpdaterFn;
}

type Store = ReduxStore<OfflineCacheShape>;

export const boundSaveSnapshot = <CacheShape extends NormalizedCacheObject>(
  store: Store,
  cache: ApolloCache<CacheShape>,
): ReturnType<typeof saveSnapshot> => store.dispatch(saveSnapshot(cache));

export type EnqueuedMutationEffect<T> = {
  optimisticResponse: Record<string, unknown>;
  operation: GraphQLRequest;
  update: MutationUpdaterFn<T>;
  updateQueries: MutationQueryReducersMap<T>;
  refetchQueries:
    | ((result: ExecutionResult) => RefetchQueryDescription)
    | RefetchQueryDescription;
  observer: ZenObservable.SubscriptionObserver<T>;
  fetchPolicy?: FetchPolicy;
};

export interface OfflineLinkOptions {
  store: Store;
}

export default class OfflineLink extends ApolloLink {
  private store: Store;

  constructor({ store }: OfflineLinkOptions) {
    super();
    this.store = store;
  }

  request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    const { requireOnline = false } = operation.getContext();
    if (requireOnline) {
      return forward(operation);
    }

    return new Observable((observer) => {
      // Get the network connection state from the store
      const {
        offline: { online },
      } = this.store.getState();

      const { operation: operationType } = getOperationDefinition(
        operation.query,
      );

      const isMutation = operationType === OPERATION_TYPE_MUTATION;
      const isQuery = operationType === OPERATION_TYPE_QUERY;

      if (!online && isQuery) {
        const data = this.processOfflineQuery(operation);
        observer.next({ data });
        observer.complete();
        return () => null;
      }

      if (isMutation) {
        const {
          apolloOfflineContext: { execute = false } = {},
          cache,
        } = operation.getContext();

        if (!execute) {
          const {
            [METADATA_KEY]: {
              snapshot: { enqueuedMutations },
            },
          } = this.store.getState();

          if (enqueuedMutations === 0) {
            boundSaveSnapshot(this.store, cache);
          }

          const data = this.enqueueMutation(operation, observer);

          if (!online) {
            observer.next({ data, [IS_OPTIMISTIC_KEY]: true });
            observer.complete();
          }

          return () => null;
        }
      }

      const handle = forward(operation).subscribe({
        next: observer.next.bind(observer),
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });

      return () => {
        if (handle) handle.unsubscribe();
      };
    });
  }

  processOfflineQuery = (operation: Operation) => {
    const {
      [NORMALIZED_CACHE_KEY]: normalizedCache = {},
    } = this.store.getState();

    const { query, variables, getContext } = operation;
    const { cache } = getContext();

    const offlineStore = defaultNormalizedCacheFactory(normalizedCache);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const storeReader = (cache.storeReader as unknown) as StoreReader;

    const queryData = storeReader.readQueryFromStore({
      store: offlineStore,
      query,
      variables,
    });

    return queryData;
  };

  enqueueMutation = <T>(
    operation: Operation,
    observer: ZenObservable.SubscriptionObserver<T>,
  ): Record<string, unknown> => {
    const { query: mutation, variables, getContext } = operation;
    const {
      apolloOfflineContext: {
        optimisticResponse: originalOptimisticResponse,
        update,
        updateQueries,
        refetchQueries,
        fetchPolicy,
      },
      ...operationContext
    } = getContext();

    const optimisticResponse =
      typeof originalOptimisticResponse === "function"
        ? originalOptimisticResponse(variables)
        : originalOptimisticResponse;

    // Ensure things like `cache`, `getCacheKey`, and `clientAwareness` (keys added by apollo-client)
    // are not included in the persisted context.
    const normalizedContext = Object.keys(operationContext)
      .filter((key) => APOLLO_PRIVATE_CONTEXT_KEYS.indexOf(key) < 0)
      .reduce(
        (newObj, key) =>
          Object.assign(newObj, { [key]: operationContext[key] }),
        {},
      );

    setImmediate(() => {
      const effect: EnqueuedMutationEffect<any> = {
        operation: {
          ...operation,
          context: normalizedContext,
        },
        optimisticResponse,
        update,
        updateQueries,
        refetchQueries,
        fetchPolicy,
        observer,
      };

      this.store.dispatch({
        type: actions.ENQUEUE,
        payload: { optimisticResponse },
        meta: {
          offline: {
            effect,
            commit: { type: actions.COMMIT, meta: null },
            rollback: { type: actions.ROLLBACK, meta: null },
          },
        },
      });
    });

    // If we have an optimistic response, return it.
    if (optimisticResponse) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return optimisticResponse;
    }

    // Accumulate a `null` object based on the mutation definition.
    const mutationDefinition = getMutationDefinition(mutation);
    return mutationDefinition.selectionSet.selections.reduce(
      (response: Record<string, unknown>, elem: FieldNode) => {
        response[resultKeyNameFromField(elem)] = null;
        return response;
      },
      {},
    );
  };
}
