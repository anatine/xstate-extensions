/* eslint-disable @typescript-eslint/no-unused-vars */
import { QueryClient } from '@tanstack/query-core';
import { describe, expect, it } from 'vitest';
import { assign, createActor, createMachine } from 'xstate';
import { WithTanstackQueryInput } from '../lib/types';
import {
  fromTanstackQueryObservable,
  fromTanstackQuery,
} from '../lib/withTanstackQuery';

describe('Tanstack Query', () => {
  it('It should work with an observable', async () => {
    const queryClient = new QueryClient();

    const input: WithTanstackQueryInput = {
      queryClient,
      queryKey: ['withTanstackQuery', 'observable-test'],
      queryFn: () =>
        new Promise((resolve) => {
          console.log('Setting promise');
          setTimeout(() => {
            console.log('Resolving promise');
            resolve('test');
          }, 50);
        }),
    };

    const testMachine = createMachine({
      id: 'testXstateQuery',
      context: {
        success: false,
        result: null,
      },
      initial: 'IDLE',
      states: {
        IDLE: {},
      },
      invoke: {
        src: fromTanstackQueryObservable<string>(),
        input,
        onSnapshot: {
          actions: [
            assign({
              success: ({ event }) => event.data.isSuccess,
              result: ({ event }) => event.data.data,
            }),
          ],
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    expect(actor.getSnapshot().context.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(actor.getSnapshot().context.success).toBe(true);
    expect(actor.getSnapshot().context.result).toBe('test');
  });

  it('It should work with a callback', async () => {
    const queryClient = new QueryClient();

    const input: WithTanstackQueryInput = {
      queryClient,
      queryKey: ['withTanstackQuery', 'callback-test'],
      queryFn: () =>
        new Promise((resolve) => {
          console.log('Setting promise');
          setTimeout(() => {
            console.log('Resolving promise');
            resolve('test');
          }, 50);
        }),
    };

    const testMachine = createMachine({
      id: 'testXstateQuery',
      context: {
        success: false,
        result: null,
      },
      initial: 'IDLE',
      states: {
        IDLE: {},
      },
      invoke: {
        id: 'callbackExample',
        src: fromTanstackQuery<string>(),
        input,
        onSnapshot: {
          actions: [
            assign({
              success: ({ event }) => event.data.isSuccess,
              result: ({ event }) => event.data.data,
            }),
          ],
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    expect(actor.getSnapshot().context.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(actor.getSnapshot().context.success).toBe(true);
    expect(actor.getSnapshot().context.result).toBe('test');
  });

  it('It should work with a callback & on events', async () => {
    const queryClient = new QueryClient();

    const input: WithTanstackQueryInput = {
      queryClient,
      queryKey: ['withTanstackQuery', 'callback-on-test'],
      queryFn: () =>
        new Promise((resolve) => {
          console.log('Setting promise');
          setTimeout(() => {
            console.log('Resolving promise');
            resolve('test');
          }, 50);
        }),
    };

    const testMachine = createMachine({
      id: 'testXstateQuery',
      context: {
        success: false,
        result: null,
      },
      initial: 'IDLE',
      states: {
        IDLE: {},
      },
      invoke: {
        id: 'testFetch',
        src: fromTanstackQuery<string>(),
        input,
      },
      on: {
        'testFetch.snapshot': {
          actions: [
            assign({
              success: ({ event }) => event['isSuccess'],
              result: ({ event }) => event['data'],
            }),
          ],
        },
      },
    });

    const actor = createActor(testMachine);
    actor.start();

    expect(actor.getSnapshot().context.success).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(actor.getSnapshot().context.success).toBe(true);
    expect(actor.getSnapshot().context.result).toBe('test');
  });
});
