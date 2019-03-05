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

import RetroApi from '../api/retro_api';
import Logger from '../helpers/logger';

function apiToken($store, retroId) {
  return $store.get('localStorage', 'apiTokens', String(retroId));
}

export default {
  retroCreate({data}) {
    Logger.info('retroCreate');
    const authToken = this.$store.get('localStorage', 'authToken');
    return RetroApi.createRetro({authToken, ...data}).then(([status, response]) => {
      if (status >= 200 && status < 400) {
        const token = response.token;
        if (token) {
          this.dispatch({type: 'setApiToken', data: {slug: response.retro.slug, apiToken: token}});
        }
        // Delay navigating to retro, otherwise the dispatcher will be invoked BEFORE p-flux updates the model
        Promise.resolve().then(() => this.dispatch({type: 'retroSuccessfullyCreated', data: response}));
      } else if (status === 422) {
        this.dispatch({type: 'retroUnsuccessfullyCreated', data: response});
      }
    });
  },

  getRetro({data: {id}}) {
    Logger.info('getRetro');
    return RetroApi.getRetro(id, apiToken(this.$store, id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: id}});
      } else if (status === 404) {
        Logger.warn(`getRetro: Retro not found, retroId=${id}`);
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },

  getRetros() {
    Logger.info('getRetros');
    const authToken = this.$store.get('localStorage', 'authToken');
    return RetroApi.getRetros({authToken}).then(([, data]) => {
      this.dispatch({type: 'retrosSuccessfullyFetched', data});
    });
  },

  getRetroSettings({data: {id}}) {
    Logger.info('getRetroSettings');
    return RetroApi.getRetroSettings(id, apiToken(this.$store, id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'getRetroSettingsSuccessfullyReceived', data});
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: id}});
      } else if (status === 404) {
        Logger.warn(`getRetro: Retro not found, retroId=${id}`);
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },

  getRetroLogin({data: {retro_id}}) {
    Logger.info('getRetroLogin');
    return RetroApi.getRetroLogin(retro_id).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'getRetroLoginSuccessfullyReceived', data});
      } else if (status === 404) {
        Logger.warn(`getRetro: Retro not found, retroId=${retro_id}`);
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },

  loginToRetro({data}) {
    Logger.info('loginToRetro');
    return RetroApi.loginToRetro(data).then(([status, response]) => {
      if (status >= 200 && status < 400) {
        const token = response.token;
        if (token) {
          this.dispatch({type: 'setApiToken', data: {slug: data.retro_id, apiToken: token}});
        }

        // Delay navigating to retro, otherwise the dispatcher will be invoked BEFORE p-flux updates the model
        Promise.resolve().then(() => this.dispatch({type: 'retroSuccessfullyLoggedIn', data: {retro_id: data.retro_id}}));
      } else {
        this.dispatch({type: 'retroLoginFailed'});
      }
    });
  },

  createRetroItem({data: {retro_id, category, description}}) {
    Logger.info('createRetroItem');
    return RetroApi.createRetroItem(retro_id, category, description, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyCreated', data: {item: data.item, retroId: retro_id}});
    });
  },

  updateRetroItem({data: {retro_id, item, description}}) {
    Logger.info('updateRetroItem');
    return RetroApi.updateRetroItem(retro_id, item.id, description, apiToken(this.$store, retro_id));
  },

  deleteRetroItem({data: {retro_id, item}}) {
    Logger.info('deleteRetroItem');
    RetroApi.deleteRetroItem(retro_id, item.id, apiToken(this.$store, retro_id));
    this.dispatch({type: 'retroItemSuccessfullyDeleted', data: {retro_id, item}});
  },

  voteRetroItem({data: {retro_id, item}}) {
    Logger.info('voteRetroItem');
    RetroApi.voteRetroItem(retro_id, item.id, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyVoted', data: {item: data.item}});
    });
  },

  nextRetroItem({data: {retro_id}}) {
    Logger.info('nextRetroItem');
    const retro = this.$store.refine('retro').get();
    if (retro.highlighted_item_id !== null) {
      this.dispatch({type: 'retroItemSuccessfullyDone', data: {retroId: retro_id, itemId: retro.highlighted_item_id}});
    }
    RetroApi.nextRetroItem(retro_id, apiToken(this.$store, retro_id));
  },

  highlightRetroItem({data: {retro_id, item}}) {
    Logger.info('highlightRetroItem');
    RetroApi.highlightRetroItem(retro_id, item.id, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyHighlighted', data});
    });
  },

  unhighlightRetroItem({data: {retro_id, item_id}}) {
    Logger.info('unhighlightRetroItem');
    RetroApi.unhighlightRetroItem(retro_id, apiToken(this.$store, retro_id));
    this.dispatch({type: 'retroItemSuccessfullyUnhighlighted', data: {highlighted_item_id: item_id}});
  },

  doneRetroItem({data: {retroId, item}}) {
    Logger.info('doneRetroItem');
    RetroApi.doneRetroItem(retroId, item.id, apiToken(this.$store, retroId));
    this.dispatch({type: 'retroItemSuccessfullyDone', data: {retroId, itemId: item.id}});
  },

  undoneRetroItem({data: {retroId, item}}) {
    Logger.info('undoneRetroItem');
    RetroApi.undoneRetroItem(retroId, item.id, apiToken(this.$store, retroId));
    this.dispatch({type: 'retroItemSuccessfullyUndone', data: {retroId, item}});
  },

  extendTimer({data: {retro_id}}) {
    Logger.info('extendTimer');
    RetroApi.extendTimer(retro_id, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'extendTimerSuccessfullyDone', data});
    });
  },

  archiveRetro({data: {retro}}) {
    Logger.info('archiveRetro');
    RetroApi.archiveRetro(retro.slug, apiToken(this.$store, retro.slug), retro.send_archive_email).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'archiveRetroSuccessfullyDone', data});
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: retro.slug}});
      }
    });
  },

  createRetroActionItem({data: {retro_id, description}}) {
    Logger.info('createRetroActionItem');
    return RetroApi.createRetroActionItem(retro_id, description, apiToken(this.$store, retro_id));
  },

  doneRetroActionItem({data: {retro_id, action_item_id, done}}) {
    Logger.info('doneRetroActionItem');
    RetroApi.doneRetroActionItem(retro_id, action_item_id, done, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'doneRetroActionItemSuccessfullyToggled', data});
    });
  },

  deleteRetroActionItem({data: {retro_id, action_item}}) {
    Logger.info('deleteRetroActionItem');
    RetroApi.deleteRetroActionItem(retro_id, action_item.id, apiToken(this.$store, retro_id));
    this.dispatch({type: 'retroActionItemSuccessfullyDeleted', data: {action_item}});
  },

  editRetroActionItem({data: {retro_id, action_item_id, description}}) {
    Logger.info('editRetroActionItem');
    RetroApi.editRetroActionItem(retro_id, action_item_id, description, apiToken(this.$store, retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroActionItemSuccessfullyEdited', data});
    });
  },

  getRetroArchive({data: {retro_id, archive_id}}) {
    Logger.info('getRetroArchive');
    return RetroApi.getRetroArchive(retro_id, archive_id, apiToken(this.$store, retro_id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroArchiveSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: retro_id}});
      } else if (status === 404) {
        this.dispatch({type: 'notFound'});
      }
    });
  },

  getRetroArchives({data: {retro_id}}) {
    Logger.info('getRetroArchives');
    return RetroApi.getRetroArchives(retro_id, apiToken(this.$store, retro_id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroArchivesSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: retro_id}});
      } else if (status === 404) {
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },

  createUser({data: {access_token, company_name, full_name}}) {
    Logger.info('createUser');
    return RetroApi.createUser(access_token, company_name, full_name).then(([, response]) => {
      this.dispatch({type: 'setAuthToken', data: {authToken: response.auth_token}});
      this.dispatch({type: 'redirectToRetroCreatePage'});
    });
  },

  createSession({data: {access_token, email, name}}) {
    return RetroApi.createSession(access_token).then(([status, data]) => {
      if (status === 200) {
        this.dispatch({type: 'setAuthToken', data: {authToken: data.auth_token}});
        this.dispatch({type: 'loggedInSuccessfully', data});
      } else if (status === 404) {
        this.dispatch({type: 'redirectToRegistration', data: {access_token, email, name}});
      }
    });
  },

  updateRetroSettings({data: {retro_id, retro_name, new_slug, old_slug, is_private, request_uuid, video_link}}) {
    Logger.info('updateRetroSettings');
    return RetroApi.updateRetro(retro_id, retro_name, new_slug, apiToken(this.$store, retro_id), is_private, request_uuid, video_link).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({
          type: 'migrateApiToken',
          data: {oldSlug: old_slug, newSlug: new_slug},
        });

        // Give p-flux time to sort itself out
        Promise.resolve().then(() => {
          this.dispatch({
            type: 'retroSettingsSuccessfullyUpdated',
            data: {retro: {name: retro_name, slug: new_slug, is_private: data.retro.is_private}},
          });
          this.dispatch({
            type: 'showAlert',
            data: {checkIcon: true, message: 'Settings saved!', className: 'alert-with-back-button'},
          });
        });
      } else if (status === 403) {
        this.dispatch({type: 'markRetroLoginNeeded', data: {slug: retro_id}});
      } else if (status === 422) {
        this.dispatch({type: 'retroSettingsUnsuccessfullyUpdated', data});
      }
    });
  },

  updateRetroPassword({data: {retro_id, current_password, new_password, request_uuid}}) {
    Logger.info('updateRetroPassword');
    return RetroApi.updateRetroPassword(retro_id, current_password, new_password, request_uuid, apiToken(this.$store, retro_id))
      .then(([status, data]) => {
        if (status >= 200 && status < 400) {
          this.dispatch({type: 'retroPasswordSuccessfullyUpdated', data: {retro_id, token: data.token}});
          this.dispatch({type: 'routeToRetroSettings', data: {retro_id}});
          this.dispatch({type: 'showAlert', data: {checkIcon: true, message: 'Password changed'}});
        } else if (status === 422) {
          this.dispatch({type: 'retroPasswordUnsuccessfullyUpdated', data});
        }
      });
  },

  retrieveConfig() {
    Logger.info('retrieveConfig');
    return RetroApi.retrieveConfig().then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({
          type: 'setConfig',
          data: {
            archive_emails: data.archive_emails,
          },
        });
      } else if (status === 404) {
        this.dispatch({type: 'notFound'});
      }
    });
  },
};
