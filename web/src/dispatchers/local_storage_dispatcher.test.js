/*
 * Postfacto, a free, open-source and self-hosted retro tool aimed at helping
 * remote teams.
 *
 * Copyright (C) 2016 - Present Pivotal Software, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 *
 * it under the terms of the GNU Affero General Public License as
 *
 * published by the Free Software Foundation, either version 3 of the
 *
 * License, or (at your option) any later version.
 *
 *
 *
 * This program is distributed in the hope that it will be useful,
 *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *
 * GNU Affero General Public License for more details.
 *
 *
 *
 * You should have received a copy of the GNU Affero General Public License
 *
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Cursor from 'pui-cursor';
import {Dispatcher} from 'p-flux';
import '../spec_helper';

import localStorageDispatcher from './local_storage_dispatcher';

describe('LocalStorageDispatcher', () => {
  let subject;
  let latestState;

  const storeCallback = (s) => {
    latestState = s;
  };

  beforeEach(() => {
    const initialStore = {
      localStorage: {
        hasAnyData: false,
        authToken: null,
        apiTokens: {},
        loginsNeeded: {},
        homeTermsDismissed: false,
        retroTermsDismissed: [],
      },
    };

    Cursor.async = false;
    subject = Dispatcher;
    subject.$store = new Cursor(initialStore, storeCallback);

    // dispatch is spied on in spec_helper
    // Only allow Local Storage Dispatcher actions to actually happen
    subject.dispatch.mockConditionalCallThrough(({type}) => Object.keys(localStorageDispatcher).includes(type));

    // prevent console logs
    jest.spyOn(subject, 'onDispatch').mockReturnValue(null);

    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  describe('reloadLocalStorage', () => {
    it('fetches all data from localstorage and puts it into state', () => {
      window.localStorage.setItem('authToken', 'my-auth');
      window.localStorage.setItem('apiToken-abc', 'def');
      window.localStorage.setItem('apiToken-123', '456');
      window.localStorage.setItem('homeTermsDismissed', 'true');
      window.localStorage.setItem('retroTermsDismissed', '["abc", "def"]');

      subject.dispatch({type: 'reloadLocalStorage'});

      expect(latestState.localStorage).toEqual({
        hasAnyData: true,
        authToken: 'my-auth',
        apiTokens: {
          'abc': 'def',
          '123': '456',
        },
        loginsNeeded: {},
        homeTermsDismissed: true,
        retroTermsDismissed: ['abc', 'def'],
      });
    });

    it('sets hasAnyData false if there is no data', () => {
      subject.dispatch({type: 'reloadLocalStorage'});

      expect(latestState.localStorage).toEqual({
        hasAnyData: false,
        authToken: null,
        apiTokens: {},
        loginsNeeded: {},
        homeTermsDismissed: false,
        retroTermsDismissed: [],
      });
    });
  });

  describe('setAuthToken', () => {
    it('updates the window localStorage', () => {
      subject.dispatch({type: 'setAuthToken', data: {authToken: 'abc'}});

      expect(window.localStorage.getItem('authToken')).toEqual('abc');
    });

    it('updates the internal state', () => {
      subject.dispatch({type: 'setAuthToken', data: {authToken: 'abc'}});

      expect(latestState.localStorage.authToken).toEqual('abc');
      expect(latestState.localStorage.hasAnyData).toEqual(true);
    });
  });

  describe('setApiToken', () => {
    it('updates the window localStorage', () => {
      subject.dispatch({type: 'setApiToken', data: {slug: 'foo', apiToken: 'abc'}});

      expect(window.localStorage.getItem('apiToken-foo')).toEqual('abc');
    });

    it('updates the internal state', () => {
      subject.dispatch({type: 'setApiToken', data: {slug: 'foo', apiToken: 'abc'}});

      expect(latestState.localStorage.apiTokens).toEqual({foo: 'abc'});
      expect(latestState.localStorage.hasAnyData).toEqual(true);
    });
  });

  describe('setHomeTermsDismissed', () => {
    it('updates the window localStorage', () => {
      subject.dispatch({type: 'setHomeTermsDismissed'});

      expect(window.localStorage.getItem('homeTermsDismissed')).toEqual('true');
    });

    it('updates the internal state', () => {
      subject.dispatch({type: 'setHomeTermsDismissed'});

      expect(latestState.localStorage.homeTermsDismissed).toEqual(true);
      expect(latestState.localStorage.hasAnyData).toEqual(true);
    });
  });

  describe('setRetroTermsDismissed', () => {
    it('updates the window localStorage', () => {
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'abc'}});

      expect(window.localStorage.getItem('retroTermsDismissed')).toEqual('["abc"]');
    });

    it('updates the internal state', () => {
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'abc'}});

      expect(latestState.localStorage.retroTermsDismissed).toEqual(['abc']);
      expect(latestState.localStorage.hasAnyData).toEqual(true);
    });

    it('combines multiple items', () => {
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'abc'}});
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'def'}});

      expect(window.localStorage.getItem('retroTermsDismissed')).toEqual('["abc","def"]');
      expect(latestState.localStorage.retroTermsDismissed).toEqual(['abc', 'def']);
    });

    it('de-duplicates', () => {
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'abc'}});
      subject.dispatch({type: 'setRetroTermsDismissed', data: {slug: 'abc'}});

      expect(window.localStorage.getItem('retroTermsDismissed')).toEqual('["abc"]');
      expect(latestState.localStorage.retroTermsDismissed).toEqual(['abc']);
    });
  });

  describe('clearLocalStorage', () => {
    it('removes all items from local storage', () => {
      window.localStorage.setItem('authToken', 'my-auth');
      window.localStorage.setItem('apiToken-abc', 'def');
      window.localStorage.setItem('apiToken-123', '456');
      window.localStorage.setItem('homeTermsDismissed', 'true');
      window.localStorage.setItem('retroTermsDismissed', '["abc", "def"]');

      subject.dispatch({type: 'clearLocalStorage'});

      expect(window.localStorage).toHaveLength(0);
    });

    it('resets the internal state', () => {
      const initialStore = {
        localStorage: {
          hasAnyData: true,
          authToken: 'abc',
          apiTokens: {x: 'y'},
          loginsNeeded: {},
          homeTermsDismissed: true,
          retroTermsDismissed: ['z'],
        },
      };

      subject.$store = new Cursor(initialStore, storeCallback);

      subject.dispatch({type: 'clearLocalStorage'});

      expect(latestState.localStorage).toEqual({
        hasAnyData: false,
        authToken: null,
        apiTokens: {},
        loginsNeeded: {},
        homeTermsDismissed: false,
        retroTermsDismissed: [],
      });
    });
  });
});
