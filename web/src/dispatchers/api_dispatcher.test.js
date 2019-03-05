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

import PromiseMock from 'promise-mock';
import Cursor from 'pui-cursor';
import Grapnel from 'grapnel';
import {Dispatcher} from 'p-flux';
import MockFetch from '../test_support/fetch_matchers';
import '../spec_helper';

import apiDispatcher from './api_dispatcher';

describe('ApiDispatcher', () => {
  let subject;
  let cursorSpy;
  let retro;
  let initialState;

  beforeEach(() => {
    PromiseMock.install();

    Cursor.async = false;
    cursorSpy = jest.fn().mockName('callback');
    subject = Dispatcher;

    // dispatch is spied on in spec_helper
    // Only allow API Dispatcher actions to actually happen
    subject.dispatch.mockConditionalCallThrough(({type}) => Object.keys(apiDispatcher).includes(type));

    // prevent console logs
    jest.spyOn(subject, 'onDispatch').mockReturnValue(null);

    retro = {
      id: 1,
      name: 'retro name',
      slug: 'retro-slug-123',
      items: [
        {
          id: 2,
          description: 'happy description',
          vote_count: 1,
          created_at: '2016-01-01T00:00:00.000Z',
        },
        {
          id: 3,
          description: '2nd description',
          vote_count: 3,
          created_at: '2016-01-02T00:00:00.000Z',
        },
        {
          id: 4,
          description: '2nd description',
          vote_count: 2,
          created_at: '2016-01-03T00:00:00.000Z',
        },
      ],
      action_items: [
        {
          id: 1,
          description: 'action item 1',
          done: false,
        },
      ],
    };

    initialState = {
      retro,
      localStorage: {
        authToken: null,
        apiTokens: {},
      },
    };

    subject.$store = new Cursor(initialState, cursorSpy);

    MockFetch.install();
  });

  afterEach(() => {
    PromiseMock.uninstall();
    MockFetch.uninstall();
  });

  function setAuthToken(authToken) {
    initialState.localStorage.authToken = authToken;
    subject.$store = new Cursor(initialState, cursorSpy);
  }

  function setApiToken(slug, apiToken) {
    initialState.localStorage.apiTokens[slug] = apiToken;
    subject.$store = new Cursor(initialState, cursorSpy);
  }

  describe('retroCreate', () => {
    beforeEach(() => {
      setAuthToken('the-auth-token');

      subject.dispatch({
        type: 'retroCreate',
        data: {
          name: 'the retro name',
          slug: 'retro-slug-123',
          password: 'the-retro-password',
        },
      });
    });

    it('makes an api POST to /retros', () => {
      expect(MockFetch).toHaveRequested('https://example.com/retros', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-auth-token': 'the-auth-token',
        },
        data: {
          retro: {
            name: 'the retro name',
            slug: 'retro-slug-123',
            password: 'the-retro-password',
          },
        },
      });
      const request = MockFetch.latestRequest();
      request.ok({retro, token: 'the-token'});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived('retroSuccessfullyCreated');
      expect(Dispatcher).toHaveReceived({type: 'setApiToken', data: {slug: 'retro-slug-123', apiToken: 'the-token'}});
    });

    describe('when unprocessable entity is received', () => {
      beforeEach(() => {
        const request = MockFetch.latestRequest();
        request.resolveJsonStatus(422, {errors: ['some error']});
        Promise.runAll();
      });

      it('dispatches retroUnsuccessfullyCreated', () => {
        expect(Dispatcher).toHaveReceived({
          type: 'retroUnsuccessfullyCreated',
          data: {errors: ['some error']},
        });
      });

      it('does not reset API token', () => {
        expect(Dispatcher).not.toHaveReceived('setApiToken');
      });
    });
  });

  describe('updateRetroSettings', () => {
    function dispatchRetroData(new_slug, old_slug, is_private, request_uuid) {
      const data = {
        retro_id: old_slug,
        retro_name: 'the new retro name',
        new_slug,
        old_slug,
        is_private,
        request_uuid,
      };

      subject.dispatch({type: 'updateRetroSettings', data});
    }

    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-auth-token');

      subject.router = new Grapnel({pushState: true});
      subject.router.get('/retros/:id', () => {});
    });

    it('makes an api PATCH to /retros/:id', () => {
      dispatchRetroData('the-new-slug-123', 'retro-slug-123', true, 'some-uuid');
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-auth-token',
        },
        data: {
          retro: {
            name: 'the new retro name',
            slug: 'the-new-slug-123',
            is_private: true,
          },
          request_uuid: 'some-uuid',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({
        retro: {
          name: 'the new retro name',
          slug: 'the-new-slug-123',
          is_private: true,
        },
      });
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'retroSettingsSuccessfullyUpdated',
        data: {
          retro: {
            name: 'the new retro name',
            slug: 'the-new-slug-123',
            is_private: true,
          },
        },
      });

      expect(Dispatcher).toHaveReceived({
        type: 'showAlert',
        data: {
          checkIcon: true,
          message: 'Settings saved!',
          className: 'alert-with-back-button',
        },
      });
    });

    describe('when forbidden is received', () => {
      beforeEach(() => {
        dispatchRetroData('the-new-slug-123', 'retro-slug-123', 'some-uuid');

        const request = MockFetch.latestRequest();
        request.forbidden();
        Promise.runAll();
      });

      it('dispatches markRetroLoginNeeded', () => {
        expect(Dispatcher).toHaveReceived({
          type: 'markRetroLoginNeeded',
          data: {slug: 'retro-slug-123'},
        });
      });
    });

    describe('when unprocessable entity is received', () => {
      beforeEach(() => {
        dispatchRetroData('the-new-slug-123', 'retro-slug-123', 'some-uuid');

        const request = MockFetch.latestRequest();
        request.resolveJsonStatus(422, {errors: ['some error']});
        Promise.runAll();
      });

      it('dispatches retroSettingsUnsuccessfullyUpdated', () => {
        expect(Dispatcher).toHaveReceived({
          type: 'retroSettingsUnsuccessfullyUpdated',
          data: {errors: ['some error']},
        });
      });
    });

    describe('when slug is not modified and name is changed', () => {
      beforeEach(() => {
        dispatchRetroData('retro-slug-123', 'retro-slug-123', false, 'some-uuid');

        const request = MockFetch.latestRequest();
        request.ok({
          retro: {
            name: 'the new retro name',
            slug: 'retro-slug-123',
            is_private: false,
          },
        });
        Promise.runAll();
      });

      it('dispatches retroSettingsSuccessfullyUpdated', () => {
        expect(Dispatcher).toHaveReceived({
          type: 'retroSettingsSuccessfullyUpdated',
          data: {
            retro: {
              name: 'the new retro name',
              slug: 'retro-slug-123',
              is_private: false,
            },
          },
        });
      });
    });
  });

  describe('updateRetroPassword', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-auth-token');

      subject.dispatch({
        type: 'updateRetroPassword',
        data: {
          retro_id: 'retro-slug-123',
          current_password: 'current password',
          new_password: 'new password',
          request_uuid: 'some-request-uuid',
        },
      });

      subject.router = new Grapnel({pushState: true});
      subject.router.get('/retros/:id/settings', () => {});
    });

    it('makes an api PATCH to /retros/:id/password', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/password', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-auth-token',
        },
        data: {
          current_password: 'current password',
          new_password: 'new password',
          request_uuid: 'some-request-uuid',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({token: 'new-api-token'});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'retroPasswordSuccessfullyUpdated',
        data: {
          retro_id: 'retro-slug-123',
          token: 'new-api-token',
        },
      });

      expect(Dispatcher).toHaveReceived({
        type: 'routeToRetroSettings',
        data: {
          retro_id: 'retro-slug-123',
        },
      });

      expect(Dispatcher).toHaveReceived({
        type: 'showAlert',
        data: {
          checkIcon: true,
          message: 'Password changed',
        },
      });
    });

    describe('when unprocessable entity is received', () => {
      beforeEach(() => {
        const request = MockFetch.latestRequest();
        request.resolveJsonStatus(422, {errors: ['some error']});
        Promise.runAll();
      });

      it('dispatches retroPasswordUnsuccessfullyUpdated', () => {
        expect(Dispatcher).toHaveReceived({
          type: 'retroPasswordUnsuccessfullyUpdated',
          data: {errors: ['some error']},
        });
      });
    });
  });

  describe('getRetro', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'getRetro', data: {id: 'retro-slug-123'}});
    });

    it('makes an api GET to /retros/:id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123', {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok({retro});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'retroSuccessfullyFetched',
        data: {retro},
      });
    });

    describe('when forbidden is received', () => {
      it('dispatches markRetroLoginNeeded', () => {
        const request = MockFetch.latestRequest();
        request.forbidden();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'markRetroLoginNeeded',
          data: {slug: 'retro-slug-123'},
        });
      });
    });

    describe('when retro does not exist', () => {
      it('dispatches retroNotFound', () => {
        const request = MockFetch.latestRequest();
        request.notFound();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'retroNotFound',
        });
      });
    });
  });

  describe('getRetros', () => {
    beforeEach(() => {
      setAuthToken('the-auth-token');
      subject.dispatch({type: 'getRetros'});
    });

    it('makes an API GET to /retros', () => {
      expect(MockFetch).toHaveRequested('/retros', {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'x-auth-token': 'the-auth-token',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({retros: [retro]});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'retrosSuccessfullyFetched',
        data: {retros: [retro]},
      });
    });
  });

  describe('getRetroLogin', () => {
    beforeEach(() => {
      subject.dispatch({type: 'getRetroLogin', data: {retro_id: 'retro-slug-123'}});
    });

    it('makes an api GET to /retros/:id/sessions/new', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/sessions/new', {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
      });
      const retroData = {id: 1, slug: 'retro-slug-123', name: 'the-fetched-retro-login-name'};
      const request = MockFetch.latestRequest();
      request.ok({retro: retroData});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'getRetroLoginSuccessfullyReceived',
        data: {retro: retroData},
      });
    });

    describe('when retro does not exist', () => {
      it('dispatches retroNotFound', () => {
        const request = MockFetch.latestRequest();
        request.notFound();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'retroNotFound',
        });
      });
    });
  });

  describe('getRetroSettings', () => {
    const doSetup = () => {
      subject.dispatch({type: 'getRetroSettings', data: {id: 'retro-slug-123'}});
    };

    describe('GET /retros/:id/settings', () => {
      it('returns the retro settings when authenticated', () => {
        setApiToken('retro-slug-123', 'the-token');
        doSetup();

        expect(MockFetch).toHaveRequested('/retros/retro-slug-123/settings', {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': 'Bearer the-token',
          },
        });
        const request = MockFetch.latestRequest();
        const response = {retro: {id: 1, name: 'the-fetched-retro-login-name', slug: 'retro-slug-123'}};
        request.ok(response);
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'getRetroSettingsSuccessfullyReceived',
          data: response,
        });
      });

      it('is forbidden when not authenticated', () => {
        setApiToken('retro-slug-123', '');
        doSetup();

        expect(MockFetch).toHaveRequested('/retros/retro-slug-123/settings', {
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
          },
        });
        const request = MockFetch.latestRequest();
        request.forbidden();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'markRetroLoginNeeded',
          data: {slug: 'retro-slug-123'},
        });
      });
    });
  });

  describe('loginToRetro', () => {
    beforeEach(() => {
      subject.dispatch({type: 'loginToRetro', data: {retro_id: 'retro-slug-15', password: 'pa55word'}});
    });

    it('makes an api POST to /retros/:id/sessions', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-15/sessions', {
        method: 'POST',
        data: {retro: {password: 'pa55word'}},
      });
      const request = MockFetch.latestRequest();
      request.ok({token: 'the-token'});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({type: 'setApiToken', data: {slug: 'retro-slug-15', apiToken: 'the-token'}});
      expect(Dispatcher).toHaveReceived({
        type: 'retroSuccessfullyLoggedIn',
        data: {retro_id: 'retro-slug-15'},
      });
    });

    describe('when password is wrong', () => {
      it('dispatches retroLoginFailed', () => {
        const request = MockFetch.latestRequest();
        request.notFound();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'retroLoginFailed',
        });
      });
    });
  });

  describe('deleteRetroItem', () => {
    let item;
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      item = retro.items[0];
      subject.dispatch({type: 'deleteRetroItem', data: {retro_id: 'retro-slug-123', item}});
    });
    it('makes an api DELETE to /retros/:id/items/:item_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items/2', {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyDeleted',
        data: {retro_id: 'retro-slug-123', item},
      });
    });
  });

  describe('createRetroItem', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'createRetroItem', data: {retro_id: 'retro-slug-123', description: 'happy item', category: 'happy'}});
    });

    it('makes an api POST to /retros/:id/items', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          description: 'happy item',
          category: 'happy',
        },
      });
    });

    it('dispatches retroItemSuccessfullyCreated with the response', () => {
      const request = MockFetch.latestRequest();
      request.ok({item: {id: 1, category: 'happy', description: 'this is an item'}});
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyCreated',
        data: {item: {id: 1, category: 'happy', description: 'this is an item'}, retroId: 'retro-slug-123'},
      });
    });
  });

  describe('updateRetroItem', () => {
    let item;
    beforeEach(() => {
      item = retro.items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'updateRetroItem', data: {retro_id: 'retro-slug-123', item, description: 'updated description'}});
    });

    it('makes an api PATCH to /retros/:retro_id/items/:id', () => {
      expect(MockFetch).toHaveRequested(`/retros/retro-slug-123/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          description: 'updated description',
        },
      });
    });
  });

  describe('deleteRetroItem', () => {
    let item;
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      item = retro.items[0];
      subject.dispatch({type: 'deleteRetroItem', data: {retro_id: 'retro-slug-123', item}});
    });

    it('makes an api DELETE to /retros/:id/items/:item_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items/2', {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyDeleted',
        data: {retro_id: 'retro-slug-123', item},
      });
    });
  });

  describe('voteRetroItem', () => {
    let item;
    beforeEach(() => {
      item = retro.items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'voteRetroItem', data: {retro_id: 'retro-slug-123', item}});
    });
    it('makes an api POST to /retros/:id/items/:item_id/vote', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items/2/vote', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({item});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyVoted',
        data: {item},
      });
    });
  });

  describe('nextRetroItem', () => {
    it('makes an API POST to /retros/:id/discussion/transitions', () => {
      retro.highlighted_item_id = 2;
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'nextRetroItem', data: {retro_id: 'retro-slug-123'}});

      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/discussion/transitions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {transition: 'NEXT'},
      });

      const request = MockFetch.latestRequest();
      request.ok({retro});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived('retroItemSuccessfullyDone');
    });
  });

  describe('highlightRetroItem', () => {
    let item;
    beforeEach(() => {
      item = retro.items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'highlightRetroItem', data: {retro_id: 'retro-slug-123', item}});
    });
    it('makes an api POST to /retros/:id/discussion', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/discussion', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {item_id: 2},
      });

      const request = MockFetch.latestRequest();
      request.ok({retro});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyHighlighted',
        data: {retro},
      });
    });
  });

  describe('unhighlightRetroItem', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'unhighlightRetroItem', data: {retro_id: 'retro-slug-123'}});
    });
    it('makes an api DELETE to /retros/:id/discussion', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/discussion', {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      expect(Dispatcher).toHaveReceived('retroItemSuccessfullyUnhighlighted');
    });
  });

  describe('doneRetroItem', () => {
    let item;
    beforeEach(() => {
      item = retro.items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'doneRetroItem', data: {retroId: 'retro-slug-123', item}});
    });
    it('makes an api PATCH to /retros/:id/items/:item_id/done', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items/2/done', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });

      item = retro.items[0];
      item.done = true;
      const request = MockFetch.latestRequest();
      request.ok({item});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyDone',
        data: {retroId: 'retro-slug-123', itemId: item.id},
      });
    });
  });

  describe('undoneRetroItem', () => {
    let item;

    beforeEach(() => {
      item = retro.items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'undoneRetroItem', data: {retroId: 'retro-slug-123', item}});
    });

    it('makes an api PATCH to /retros/:id/items/:item_id/done', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/items/2/done', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          done: false,
        },
      });

      const request = MockFetch.latestRequest();
      request.noContent();
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'retroItemSuccessfullyUndone',
        data: {retroId: 'retro-slug-123', item},
      });
    });
  });

  describe('extendTimer', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'extendTimer', data: {retro_id: 'retro-slug-123'}});
    });

    it('makes an api PATCH to /retros/:id/discussion', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/discussion', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({retro});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'extendTimerSuccessfullyDone',
        data: {retro},
      });
    });
  });

  describe('archiveRetro', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'archiveRetro', data: {retro: {slug: 'retro-slug-123', send_archive_email: true}}});
    });

    it('makes an api PUT to /retros/:id/archive', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/archive', {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          send_archive_email: true,
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({retro});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'archiveRetroSuccessfullyDone',
        data: {retro},
      });
    });
  });

  describe('createRetroActionItem', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'createRetroActionItem', data: {retro_id: 'retro-slug-123', description: 'a new action item'}});
    });

    it('makes an api POST to /retros/:id/action_items', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/action_items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          description: 'a new action item',
        },
      });
    });
  });

  describe('doneRetroActionItem', () => {
    let action_item;

    beforeEach(() => {
      action_item = retro.action_items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'doneRetroActionItem', data: {retro_id: 'retro-slug-123', action_item_id: 1, done: true}});
    });

    it('makes an api PATCH to /retros/:id/action_items/:action_item_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/action_items/1', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
        data: {
          done: true,
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({action_item});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'doneRetroActionItemSuccessfullyToggled',
        data: {action_item},
      });
    });
  });

  describe('deleteRetroActionItem', () => {
    let action_item;
    beforeEach(() => {
      action_item = retro.action_items[0];
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'deleteRetroActionItem', data: {retro_id: 'retro-slug-123', action_item}});
    });

    it('makes an api DELETE to /retros/:id/action_items/:action_item_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/action_items/1', {
        method: 'DELETE',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      expect(Dispatcher).toHaveReceived({
        type: 'retroActionItemSuccessfullyDeleted',
        data: {action_item},
      });
    });
  });

  describe('editRetroActionItem', () => {
    let action_item;
    beforeEach(() => {
      action_item = retro.action_items[0];
      setApiToken('retro-slug-123', 'the-token');

      subject.dispatch({
        type: 'editRetroActionItem',
        data: {retro_id: 'retro-slug-123', action_item_id: action_item.id, description: 'this is a description'},
      });
    });

    it('makes an api PUT to /retros/:id/action_items/:action_item_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/action_items/1', {
        method: 'PATCH',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({action_item});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({
        type: 'retroActionItemSuccessfullyEdited',
        data: {action_item},
      });
    });
  });

  describe('getRetroArchives', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'getRetroArchives', data: {retro_id: 'retro-slug-123'}});
    });

    it('makes an api GET to /retros/:retro_id/archives', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/archives', {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok();
      Promise.runAll();
      expect(Dispatcher).toHaveReceived('retroArchivesSuccessfullyFetched');
    });

    describe('when retro does not exist', () => {
      it('dispatches retroNotFound', () => {
        const request = MockFetch.latestRequest();
        request.notFound();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'retroNotFound',
        });
      });
    });
  });

  describe('getRetroArchive', () => {
    beforeEach(() => {
      setApiToken('retro-slug-123', 'the-token');
      subject.dispatch({type: 'getRetroArchive', data: {retro_id: 'retro-slug-123', archive_id: '1'}});
    });

    it('makes an api GET to /retros/:retro_id/archives/:archive_id', () => {
      expect(MockFetch).toHaveRequested('/retros/retro-slug-123/archives/1', {
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'authorization': 'Bearer the-token',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok();
      Promise.runAll();
      expect(Dispatcher).toHaveReceived('retroArchiveSuccessfullyFetched');
    });

    describe('when archives do not exist', () => {
      it('dispatches notFound', () => {
        const request = MockFetch.latestRequest();
        request.notFound();
        Promise.runAll();
        expect(Dispatcher).toHaveReceived({
          type: 'notFound',
        });
      });
    });
  });

  describe('createUser', () => {
    beforeEach(() => {
      subject.dispatch({
        type: 'createUser',
        data: {access_token: 'the-access-token', company_name: 'Company name', full_name: 'My Full Name'},
      });
    });

    it('makes an api POST to /users', () => {
      expect(MockFetch).toHaveRequested('/users', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        data: {
          'access_token': 'the-access-token',
          'company_name': 'Company name',
          'full_name': 'My Full Name',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok();
      Promise.runAll();
      expect(Dispatcher).toHaveReceived('redirectToRetroCreatePage');
    });

    it('stores the auth token in local storage', () => {
      const request = MockFetch.latestRequest();
      request.ok({auth_token: 'the-token'});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({type: 'setAuthToken', data: {authToken: 'the-token'}});
    });
  });

  describe('createSession', () => {
    beforeEach(() => {
      subject.dispatch({
        type: 'createSession',
        data: {access_token: 'the-access-token', email: 'a@a.a', name: 'My full name'},
      });
    });

    it('makes an api POST to /sessions', () => {
      expect(MockFetch).toHaveRequested('/sessions', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
        data: {
          'access_token': 'the-access-token',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok();
      Promise.runAll();
      expect(Dispatcher).toHaveReceived('loggedInSuccessfully');
    });

    it('if the server returns a 404 because the user does not exist', () => {
      const request = MockFetch.latestRequest();
      request.notFound();
      Promise.runAll();
      expect(Dispatcher).toHaveReceived({
        type: 'redirectToRegistration',
        data: {
          'access_token': 'the-access-token',
          'email': 'a@a.a',
          'name': 'My full name',
        },
      });
    });

    it('stores the auth token in local storage', () => {
      const request = MockFetch.latestRequest();
      request.ok({auth_token: 'the-token'});
      Promise.runAll();

      expect(Dispatcher).toHaveReceived({type: 'setAuthToken', data: {authToken: 'the-token'}});
    });
  });

  describe('retrieveConfig', () => {
    beforeEach(() => {
      subject.dispatch({type: 'retrieveConfig', data: undefined});
    });

    it('makes an api GET to /config', () => {
      expect(MockFetch).toHaveRequested('/config', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
      });
      const request = MockFetch.latestRequest();
      request.ok();
      Promise.runAll();
    });
  });
});
