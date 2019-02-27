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
import types from 'prop-types';
import {Actions} from 'p-flux';
import Logger from '../../helpers/logger';

export default class RetroCable extends React.Component {
  static propTypes = {
    cable: types.object.isRequired,
    retroId: types.string.isRequired,
    apiToken: types.string,
  };

  static defaultProps = {
    apiToken: null,
  };

  constructor(props) {
    super(props);
    this.state = {subscription: null};
  }

  componentDidMount() {
    const {cable, retroId, apiToken} = this.props;
    this.initialize(cable, retroId, apiToken);
  }

  componentWillReceiveProps(nextProps) {
    const {cable, retroId, apiToken} = nextProps;
    this.initialize(cable, retroId, apiToken);
  }

  componentWillUnmount() {
    const {cable} = this.props;
    cable.connection.close({allowReconnect: false});
    cable.subscriptions.remove(this.state.subscription);
  }

  initialize(cable, retroId, apiToken) {
    if (!cable) {
      return;
    }

    if (this.state.subscription) {
      return;
    }

    const subscription = cable.subscriptions.create(
      {channel: 'RetrosChannel', retro_id: retroId, api_token: apiToken},
      {
        received: this.onReceived,
        disconnected: this.onDisconnected,
      },
    );

    this.setState({subscription});
  }

  onReceived(data) {
    Actions.websocketRetroDataReceived(data);
  }

  onDisconnected(data) {
    Logger.info('disconnected from actioncable', data);
  }

  render() {
    return null;
  }
}
