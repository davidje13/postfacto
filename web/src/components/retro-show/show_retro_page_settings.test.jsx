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

import React from 'react';
import {mount} from 'enzyme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import {Dispatcher} from 'p-flux';
import {invokeMenuOption} from '../../test_support/retro_menu_getters';
import '../../spec_helper';

import ShowRetroPage from './show_retro_page';

const config = {
  title: 'Retro',
  api_base_url: 'https://example.com',
  websocket_url: 'ws://websocket/url',
  contact: '',
  terms: '',
  privacy: '',
};

describe('Retro settings', () => {
  let retro;
  let localStorage;
  let dom;

  beforeEach(() => {
    retro = {
      id: 13,
      slug: 'the-retro-name',
      name: 'the retro name',
      video_link: 'http://the/video/link',
      items: [],
      action_items: [],
    };

    localStorage = {
      hasAnyData: true,
      apiTokens: {},
      loginsNeeded: {},
      authToken: 'some-token',
    };

    dom = mount((
      <MuiThemeProvider>
        <ShowRetroPage
          retro={retro}
          retroId="the-retro-name"
          archives={false}
          config={config}
          featureFlags={{archiveEmails: true}}
          environment={{isMobile640: false}}
          localStorage={localStorage}
        />
      </MuiThemeProvider>
    ));
  });

  describe('retro settings menu item', () => {
    it('redirects to retro settings page if logged in', () => {
      localStorage.apiTokens = {'the-retro-name': 'some-token'};

      dom = mount((
        <MuiThemeProvider>
          <ShowRetroPage
            retro={retro}
            retroId="the-retro-name"
            archives={false}
            config={config}
            featureFlags={{archiveEmails: true}}
            environment={{isMobile640: false}}
            localStorage={localStorage}
          />
        </MuiThemeProvider>
      ));

      invokeMenuOption(dom, 'Retro settings');

      expect(Dispatcher).toHaveReceived({
        type: 'routeToRetroSettings',
        data: {retro_id: 'the-retro-name'},
      });
    });

    it('redirects to retro login page if not logged in', () => {
      localStorage.apiTokens = {};

      dom = mount((
        <MuiThemeProvider>
          <ShowRetroPage
            retro={retro}
            retroId="the-retro-name"
            archives={false}
            config={config}
            featureFlags={{archiveEmails: true}}
            environment={{isMobile640: false}}
            localStorage={localStorage}
          />
        </MuiThemeProvider>
      ));

      invokeMenuOption(dom, 'Retro settings');

      expect(Dispatcher).toHaveReceived({
        type: 'markRetroLoginNeeded',
        data: {slug: 'the-retro-name'},
      });
    });
  });
});
