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

import Mixpanel from 'mixpanel-browser';

const POSTFACTO_TEAM_ANALYTICS_TOKEN = 'd4de349453cc697734eced9ebedcdb22';

let analyticsInitialized = false;

function track($store, event, options = {}) {
  const {enable_analytics} = $store.get('config');
  if (!enable_analytics) {
    return;
  }

  if (!analyticsInitialized) {
    Mixpanel.init(POSTFACTO_TEAM_ANALYTICS_TOKEN);
    analyticsInitialized = true;
  }

  Mixpanel.track(event, Object.assign({
    timestamp: (new Date()).toJSON(),
  }, options));
}

export default {
  createdRetroAnalytics({data}) {
    track(this.$store, 'Created Retro', {'retroId': data.retroId});
  },
  visitedRetroAnalytics({data}) {
    track(this.$store, 'Retro visited', {'retroId': data.retroId});
  },
  createdRetroItemAnalytics({data}) {
    track(this.$store, 'Created Retro Item', {'retroId': data.retroId, 'category': data.category});
  },
  completedRetroItemAnalytics({data}) {
    track(this.$store, 'Completed Retro Item', {'retroId': data.retroId, 'category': data.category});
  },
  createdActionItemAnalytics({data}) {
    track(this.$store, 'Created Action Item', {'retroId': data.retroId});
  },
  doneActionItemAnalytics({data}) {
    track(this.$store, 'Done Action Item', {'retroId': data.retroId});
  },
  undoneActionItemAnalytics({data}) {
    track(this.$store, 'Undone Action Item', {'retroId': data.retroId});
  },
  archivedRetroAnalytics({data}) {
    track(this.$store, 'Archived Retro', {'retroId': data.retroId});
  },
  showHomePageAnalytics() {
    track(this.$store, 'Loaded homepage');
  },
};
