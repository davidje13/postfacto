import React from 'react';
import {mount} from 'enzyme';
import './spec_helper';

import EnhancedApplication from './Application';

describe('Application', () => {
  it('renders without crashing', () => {
    const config = {
      title: 'Retro',
      api_base_url: 'https://example.com',
      websocket_url: 'ws://websocket/url',
      enable_analytics: false,
      auth: {},
      contact: '',
      terms: '',
      privacy: '',
    };

    const app = mount(<EnhancedApplication config={config}/>);
    expect(app).toExist();
    app.unmount();
  });
});
