/* eslint-disable @typescript-eslint/no-empty-interface */
import type {
  DefinedQueryObserverResult,
  InfiniteQueryObserverOptions,
  InfiniteQueryObserverResult,
  MutateFunction,
  MutationObserverOptions,
  MutationObserverResult,
  QueryClient,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from '@tanstack/query-core';
import type { CallbackActorLogic } from 'xstate/dist/declarations/src/actors';

export interface ContextOptions {
  /**
   * Use this to pass your XState Query context. Otherwise, `defaultContext` will be used.
   */
  context?: QueryClient | undefined;
}

export type QueryEventObject<TData = unknown, TError = unknown> = {
  type: 'query.snapshot' | '$$xstate.next' | '$$xstate.error';
} & QueryObserverResult<TData, TError>;

export type QueryInput<TOptions> = {
  options: TOptions;
  queryClient: QueryClient;
  queryKey: QueryKey;
};

export interface WithTanstackQueryInput<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends ContextOptions,
    QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
  // Adding in the queryClient and a required option
  queryClient: QueryClient;
}

export type WithTanstackQueryResult<
  TData = unknown,
  TError = unknown,
  TOptions = CreateBaseQueryOptions
> = CallbackActorLogic<QueryEventObject<TData, TError>, QueryInput<TOptions>>;

export interface CreateBaseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends ContextOptions,
    QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {}

// export interface CreateBaseQueryResult<TData = unknown, TError = unknown>
//   extends QueryObserverResult<TData, TError>> {}
export type CreateBaseQueryResult<
  TData = unknown,
  TError = unknown,
  TOptions = CreateBaseQueryOptions
> = CallbackActorLogic<QueryEventObject<TData, TError>, QueryInput<TOptions>>;

export interface CreateQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends CreateBaseQueryOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    TQueryKey
  > {}

// export interface CreateQueryResult<TData = unknown, TError = unknown>
//   extends CreateBaseQueryResult<TData, TError> {}
export type CreateQueryResult<
  TData = unknown,
  TError = unknown,
  TOptions = CreateBaseQueryOptions
> = CreateBaseQueryResult<TData, TError, TOptions>;

export interface CreateInfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> extends InfiniteQueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryData,
    TQueryKey
  > {}

export type CreateInfiniteQueryResult<
  TData = unknown,
  TError = unknown
> = InfiniteQueryObserverResult<TData, TError>;

export type DefinedCreateBaseQueryResult<
  TData = unknown,
  TError = unknown
> = DefinedQueryObserverResult<TData, TError>;

export type DefinedCreateQueryResult<
  TData = unknown,
  TError = unknown
> = DefinedCreateBaseQueryResult<TData, TError>;

export interface CreateMutationOptions<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
> extends ContextOptions,
    Omit<
      MutationObserverOptions<TData, TError, TVariables, TContext>,
      '_defaulted' | 'variables'
    > {}

export type CreateMutateFunction<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
> = (
  ...args: Parameters<MutateFunction<TData, TError, TVariables, TContext>>
) => void;

export type CreateMutateAsyncFunction<
  TData = unknown,
  TError = unknown,
  TVariables = void,
  TContext = unknown
> = MutateFunction<TData, TError, TVariables, TContext>;

export type CreateBaseMutationResult<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown
> = Override<
  MutationObserverResult<TData, TError, TVariables, TContext>,
  { mutate: CreateMutateFunction<TData, TError, TVariables, TContext> }
> & {
  mutateAsync: CreateMutateAsyncFunction<TData, TError, TVariables, TContext>;
};

export type CreateMutationResult<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
  TContext = unknown
> = CreateBaseMutationResult<TData, TError, TVariables, TContext>;

type Override<A, B> = { [K in keyof A]: K extends keyof B ? B[K] : A[K] };
