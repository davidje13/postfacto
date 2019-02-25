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
import {Dispatcher} from 'p-flux';
import MockFetch from '../test_support/fetch_matchers';
import '../spec_helper';

describe('ConfigDispatcher', () => {
  let subject;
  let cursorSpy;

  beforeEach(() => {
    PromiseMock.install();

    cursorSpy = jest.fn().mockName('callback');
    Cursor.async = false;
    subject = Dispatcher;

    // dispatch is spied on in spec_helper
    subject.dispatch.mockCallThrough();

    // prevent console logs
    jest.spyOn(subject, 'onDispatch').mockReturnValue(null);

    subject.$store = new Cursor({config: {}, featureFlags: {}}, cursorSpy);

    MockFetch.install();
  });

  afterEach(() => {
    PromiseMock.uninstall();
    MockFetch.uninstall();
  });

  describe('retrieveConfig', () => {
    it('merges config data into the state', () => {
      subject.dispatch({
        type: 'setConfig',
        data: {
          config: {
            property: 'value',
          }
        },
      });

      expect(cursorSpy).toHaveBeenCalledWith({config: {property: 'value'}, featureFlags: {}});
    });

    it('makes an api GET to /config and stores feature flags', () => {
      subject.dispatch({
        type: 'setConfig',
        data: {
          config: {
            api_base_url: 'some_base',
          },
        },
      });

      expect(MockFetch).toHaveRequested('some_base/config', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
        },
      });

      const request = MockFetch.latestRequest();
      request.ok({archive_emails: true});
      Promise.runAll();

      expect(cursorSpy).toHaveBeenCalledWith({
        config: {api_base_url: 'some_base'},
        featureFlags: {archiveEmails: true},
      });
    });
  });
});
