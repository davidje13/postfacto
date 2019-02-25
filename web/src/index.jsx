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
import ReactDOM from 'react-dom';
import './stylesheets/application.scss';
import EnhancedApplication from './Application';

// Fetch config from config.js
const {config} = global.Retro;
delete global.Retro;

if (process.env.REACT_APP_USE_MOCK_GOOGLE === 'true') {
  // Mock Google auth (mock-google-server)
  config.auth = {
    mock: true,
    googleOauthClientId: null,
    googleOauthHostedDomain: null,
  };
} else if (process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID) {
  // Real Google auth
  config.auth = {
    mock: false,
    googleOauthClientId: process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID,
    googleOauthHostedDomain: process.env.REACT_APP_GOOGLE_OAUTH_HOSTED_DOMAIN,
  };
} else if (config.google_oauth_client_id === undefined) {
  // No login (must create retros via admin interface)
  config.auth = {
    mock: false,
    googleOauthClientId: null,
    googleOauthHostedDomain: null,
  };
} else {
  // Propagate settings from manual config file
  config.auth = {
    mock: false,
    googleOauthClientId: config.google_oauth_client_id,
    googleOauthHostedDomain: config.google_oauth_hosted_domain,
  };
}

ReactDOM.render(<EnhancedApplication config={config}/>, document.getElementById('root'));
