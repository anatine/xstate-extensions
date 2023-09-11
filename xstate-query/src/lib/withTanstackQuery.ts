/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  QueryClient,
  QueryObserver,
  QueryObserverResult,
  notifyManager,
  type QueryKey,
} from '@tanstack/query-core';

import {
  ActorLogic,
  ActorRefFrom,
  AnyActorSystem,
  Subscription,
  fromCallback,
} from 'xstate';
import { CallbackActorLogic } from 'xstate/dist/declarations/src/actors/callback';
import type { QueryEventObject, WithTanstackQueryInput } from './types';

export function fromTanstackQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(): CallbackActorLogic<
  QueryEventObject<TData, TError>,
  WithTanstackQueryInput<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>
> {
  return fromCallback<
    QueryEventObject<TData, TError>,
    WithTanstackQueryInput<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>
  >(({ input, self, system, sendBack, receive }) => {
    const { queryClient, ...options } = input;
    if (!queryClient) {
      throw new Error('No queryClient provided');
    }

    const defaultedOptions = queryClient.defaultQueryOptions(options);
    defaultedOptions._optimisticResults = 'optimistic';
    const observer = new QueryObserver<
      TQueryFnData,
      TError,
      TData,
      TQueryFnData,
      TQueryKey
    >(queryClient as QueryClient, defaultedOptions);

    // Include callbacks in batch renders
    if (defaultedOptions.onError) {
      defaultedOptions.onError = notifyManager.batchCalls(
        defaultedOptions.onError
      );
    }

    if (defaultedOptions.onSuccess) {
      defaultedOptions.onSuccess = notifyManager.batchCalls(
        defaultedOptions.onSuccess
      );
    }

    if (defaultedOptions.onSettled) {
      defaultedOptions.onSettled = notifyManager.batchCalls(
        defaultedOptions.onSettled
      );
    }

    observer.setOptions(defaultedOptions, { listeners: false });

    const sendSnapshot = (event: QueryObserverResult<TData, TError>) => {
      console.log(self.id);
      self._parent?.send({
        type: `xstate.snapshot.${self.id}`,
        data: event,
      });
      sendBack({
        ...event,
        type: `${self.id}.snapshot`,
      });
    };

    sendSnapshot(observer.getOptimisticResult(defaultedOptions));
    const unSubscribe = observer.subscribe(sendSnapshot);
    return () => {
      unSubscribe();
    };
  });
}

export interface ObservableInternalState<
  TData,
  TError,
  TQueryObserver,
  TInput = unknown
> {
  subscription: Subscription | undefined;
  observer: TQueryObserver | undefined;
  status: 'active' | 'done' | 'error' | 'canceled';
  data: QueryObserverResult<TData, TError>;
  input: TInput | undefined;
}

export type ObservablePersistedState<
  TData,
  TError,
  TQueryObserver,
  TInput = unknown
> = Omit<
  ObservableInternalState<TData, TError, TQueryObserver, TInput>,
  'subscription' | 'observer'
>;

export type ObservableActorLogic<TData, TError, TQueryObserver, TInput> =
  ActorLogic<
    { type: string; [k: string]: unknown },
    QueryObserverResult<TData, TError>,
    ObservableInternalState<TData, TError, TQueryObserver, TInput>,
    ObservablePersistedState<TData, TError, TQueryObserver, TInput>,
    AnyActorSystem,
    TInput
  >;

export type ObservableActorRef<TData, TError, TQueryObserver, TInput> =
  ActorRefFrom<ObservableActorLogic<TData, TError, TQueryObserver, TInput>>;

export function fromTanstackQueryObservable<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
  TInput extends WithTanstackQueryInput<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    TQueryKey
  > = WithTanstackQueryInput<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    TQueryKey
  >
>(): // observableCreator: ({
//   input,
//   system,
// }: {
//   input: TInput;
//   system: AnyActorSystem;
//   self: ObservableActorRef<
//     TData,
//     TError,
//     QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>,
//     TInput
//   >;
// }) => Subscribable<QueryEventObject<TData, TError>>
ObservableActorLogic<
  TData,
  TError,
  QueryObserver<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>,
  TInput
> {
  const nextEventType = '$$xstate.next';
  const errorEventType = '$$xstate.error';
  const completeEventType = '$$xstate.complete';

  return {
    config: (event: any) => {
      console.log('INTERNAL: config', event);
    },
    transition: (state, event, { self, id, defer }) => {
      if (state.status !== 'active') {
        return state;
      }

      switch (event.type) {
        case nextEventType:
          // match the exact timing of events sent by machines
          // send actions are not executed immediately
          defer(() => {
            self._parent?.send({
              type: `xstate.snapshot.${id}`,
              data: event['data'],
            });
          });
          return {
            ...state,
            data: (event as any).data,
          };
        case errorEventType:
          return {
            ...state,
            status: 'error',
            input: undefined,
            data: (event as any).data, // TODO: if we keep this as `data` we should reflect this in the type
            subscription: undefined,
          };
        case completeEventType:
          return {
            ...state,
            status: 'done',
            input: undefined,
            subscription: undefined,
          };
        // case XSTATE_STOP:
        case 'xstate.stop':
          state.subscription?.unsubscribe();
          return {
            ...state,
            status: 'canceled',
            input: undefined,
            subscription: undefined,
          };
        default:
          return state;
      }
    },
    getInitialState: (state, input) => {
      const { queryClient, ...options } = input;
      if (!queryClient) {
        throw new Error('No queryClient provided');
      }

      const defaultedOptions = queryClient.defaultQueryOptions(options);
      defaultedOptions._optimisticResults = 'optimistic';
      const observer = new QueryObserver<
        TQueryFnData,
        TError,
        TData,
        TQueryFnData,
        TQueryKey
      >(queryClient as QueryClient, defaultedOptions);

      return {
        subscription: undefined,
        observer,
        status: 'active',
        data: observer.getOptimisticResult(defaultedOptions),
        input,
      };
    },
    start: (state, { self, system }) => {
      if (state.status === 'done') {
        // Do not restart a completed observable
        return;
      }

      const { queryClient, ...options } = state.input as TInput;
      if (!queryClient) {
        throw new Error('No queryClient provided');
      }

      const defaultedOptions = queryClient.defaultQueryOptions(options);
      defaultedOptions._optimisticResults = 'optimistic';
      const observer = new QueryObserver<
        TQueryFnData,
        TError,
        TData,
        TQueryFnData,
        TQueryKey
      >(queryClient as QueryClient, defaultedOptions);

      // Include callbacks in batch renders
      if (defaultedOptions.onError) {
        defaultedOptions.onError = notifyManager.batchCalls(
          defaultedOptions.onError
        );
      }

      if (defaultedOptions.onSuccess) {
        defaultedOptions.onSuccess = notifyManager.batchCalls(
          defaultedOptions.onSuccess
        );
      }

      if (defaultedOptions.onSettled) {
        defaultedOptions.onSettled = notifyManager.batchCalls(
          defaultedOptions.onSettled
        );
      }

      observer.setOptions(defaultedOptions, { listeners: false });

      const unsubscribe = observer.subscribe((value) => {
        self.send({ type: '$$xstate.next', data: value });
      });

      state.subscription = { unsubscribe };
      state.observer = observer;
    },
    getSnapshot: (state) => state.data,
    getPersistedState: ({ status, data, input }) => ({
      status,
      data,
      input,
    }),
    getStatus: (state) => state,
    restoreState: (state) => ({
      ...state,
      subscription: undefined,
      observer: undefined,
    }),
  };
}
