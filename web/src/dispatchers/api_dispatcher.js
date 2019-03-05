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

export function getApiToken(retroId) {
  return localStorage.getItem('apiToken-' + retroId);
}

function setApiToken(retroId, token) {
  localStorage.setItem('apiToken-' + retroId, token);
}

function resetApiToken(oldRetroId, newRetroId) {
  if (oldRetroId === newRetroId) {
    return;
  }

  localStorage.setItem('apiToken-' + newRetroId, localStorage.getItem('apiToken-' + oldRetroId));
  localStorage.removeItem('apiToken-' + oldRetroId);
}

function getApi($store) {
  return new RetroApi($store.get('config').api_base_url);
}

export default {
  retroCreate(request) {
    Logger.info('retroCreate');
    return getApi(this.$store).createRetro(request.data).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        const token = data.token;
        if (token) {
          setApiToken(data.retro.slug, token);
        }
        this.dispatch({type: 'retroSuccessfullyCreated', data});
      } else if (status === 422) {
        this.dispatch({type: 'retroUnsuccessfullyCreated', data});
      }
    });
  },
  getRetro({data: {id}}) {
    Logger.info('getRetro');
    return getApi(this.$store).getRetro(id, getApiToken(id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id: id}});
      } else if (status === 404) {
        Logger.warn(`getRetro: Retro not found, retroId=${id}`);
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },
  getRetros() {
    Logger.info('getRetros');
    return getApi(this.$store).getRetros().then(([, data]) => {
      this.dispatch({type: 'retrosSuccessfullyFetched', data});
    });
  },
  getRetroSettings({data: {id}}) {
    Logger.info('getRetroSettings');
    return getApi(this.$store).getRetroSettings(id, getApiToken(id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'getRetroSettingsSuccessfullyReceived', data});
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id: id}});
      } else if (status === 404) {
        Logger.warn(`getRetro: Retro not found, retroId=${id}`);
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },
  getRetroLogin({data: {retro_id}}) {
    Logger.info('getRetroLogin');
    return getApi(this.$store).getRetroLogin(retro_id).then(([status, data]) => {
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
    return getApi(this.$store).loginToRetro(data).then(([status, response]) => {
      if (status >= 200 && status < 400) {
        const token = response.token;
        if (token) {
          setApiToken(data.retro_id, token);
        }
        this.dispatch({type: 'retroSuccessfullyLoggedIn', data: {retro_id: data.retro_id}});
      } else {
        this.dispatch({type: 'retroLoginFailed'});
      }
    });
  },
  createRetroItem({data: {retro_id, category, description}}) {
    Logger.info('createRetroItem');
    return getApi(this.$store).createRetroItem(retro_id, category, description, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyCreated', data: {item: data.item, retroId: retro_id}});
    });
  },
  updateRetroItem({data: {retro_id, item, description}}) {
    Logger.info('updateRetroItem');
    return getApi(this.$store).updateRetroItem(retro_id, item.id, description, getApiToken(retro_id));
  },
  deleteRetroItem({data: {retro_id, item}}) {
    Logger.info('deleteRetroItem');
    getApi(this.$store).deleteRetroItem(retro_id, item.id, getApiToken(retro_id));
    this.dispatch({type: 'retroItemSuccessfullyDeleted', data: {retro_id, item}});
  },
  voteRetroItem({data: {retro_id, item}}) {
    Logger.info('voteRetroItem');
    getApi(this.$store).voteRetroItem(retro_id, item.id, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyVoted', data: {item: data.item}});
    });
  },
  nextRetroItem({data: {retro_id}}) {
    Logger.info('nextRetroItem');
    const retro = this.$store.refine('retro').get();
    if (retro.highlighted_item_id !== null) {
      this.dispatch({type: 'retroItemSuccessfullyDone', data: {retroId: retro_id, itemId: retro.highlighted_item_id}});
    }
    getApi(this.$store).nextRetroItem(retro_id, getApiToken(retro_id));
  },
  highlightRetroItem({data: {retro_id, item}}) {
    Logger.info('highlightRetroItem');
    getApi(this.$store).highlightRetroItem(retro_id, item.id, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroItemSuccessfullyHighlighted', data});
    });
  },
  unhighlightRetroItem({data: {retro_id, item_id}}) {
    Logger.info('unhighlightRetroItem');
    getApi(this.$store).unhighlightRetroItem(retro_id, getApiToken(retro_id));
    this.dispatch({type: 'retroItemSuccessfullyUnhighlighted', data: {highlighted_item_id: item_id}});
  },
  doneRetroItem({data: {retroId, item}}) {
    Logger.info('doneRetroItem');
    getApi(this.$store).doneRetroItem(retroId, item.id, getApiToken(retroId));
    this.dispatch({type: 'retroItemSuccessfullyDone', data: {retroId, itemId: item.id}});
  },
  undoneRetroItem({data: {retroId, item}}) {
    Logger.info('undoneRetroItem');
    getApi(this.$store).undoneRetroItem(retroId, item.id, getApiToken(retroId));
    this.dispatch({type: 'retroItemSuccessfullyUndone', data: {retroId, item}});
  },
  extendTimer({data: {retro_id}}) {
    Logger.info('extendTimer');
    getApi(this.$store).extendTimer(retro_id, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'extendTimerSuccessfullyDone', data});
    });
  },
  archiveRetro({data: {retro}}) {
    Logger.info('archiveRetro');
    getApi(this.$store).archiveRetro(retro.slug, getApiToken(retro.slug), retro.send_archive_email).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'archiveRetroSuccessfullyDone', data});
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id: retro.slug}});
      }
    });
  },
  createRetroActionItem({data: {retro_id, description}}) {
    Logger.info('createRetroActionItem');
    return getApi(this.$store).createRetroActionItem(retro_id, description, getApiToken(retro_id));
  },
  doneRetroActionItem({data: {retro_id, action_item_id, done}}) {
    Logger.info('doneRetroActionItem');
    getApi(this.$store).doneRetroActionItem(retro_id, action_item_id, done, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'doneRetroActionItemSuccessfullyToggled', data});
    });
  },
  deleteRetroActionItem({data: {retro_id, action_item}}) {
    Logger.info('deleteRetroActionItem');
    getApi(this.$store).deleteRetroActionItem(retro_id, action_item.id, getApiToken(retro_id));
    this.dispatch({type: 'retroActionItemSuccessfullyDeleted', data: {action_item}});
  },
  editRetroActionItem({data: {retro_id, action_item_id, description}}) {
    Logger.info('editRetroActionItem');
    getApi(this.$store).editRetroActionItem(retro_id, action_item_id, description, getApiToken(retro_id)).then(([, data]) => {
      this.dispatch({type: 'retroActionItemSuccessfullyEdited', data});
    });
  },
  getRetroArchive({data: {retro_id, archive_id}}) {
    Logger.info('getRetroArchive');
    return getApi(this.$store).getRetroArchive(retro_id, archive_id, getApiToken(retro_id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroArchiveSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id}});
      } else if (status === 404) {
        this.dispatch({type: 'notFound'});
      }
    });
  },
  getRetroArchives({data: {retro_id}}) {
    Logger.info('getRetroArchives');
    return getApi(this.$store).getRetroArchives(retro_id, getApiToken(retro_id)).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        this.dispatch({type: 'retroArchivesSuccessfullyFetched', data});
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id}});
      } else if (status === 404) {
        this.dispatch({type: 'retroNotFound'});
      }
    });
  },
  createUser({data: {access_token, company_name, full_name}}) {
    Logger.info('createUser');
    return getApi(this.$store).createUser(access_token, company_name, full_name).then(([, response]) => {
      localStorage.setItem('authToken', response.auth_token);
      this.dispatch({type: 'redirectToRetroCreatePage'});
    });
  },
  createSession({data: {access_token, email, name}}) {
    return getApi(this.$store).createSession(access_token).then(([status, data]) => {
      if (status === 200) {
        this.dispatch({type: 'loggedInSuccessfully', data});
      } else if (status === 404) {
        this.dispatch({type: 'redirectToRegistration', data: {access_token, email, name}});
      }
    });
  },
  updateRetroSettings({data: {retro_id, retro_name, new_slug, old_slug, is_private, request_uuid, video_link}}) {
    Logger.info('updateRetroSettings');
    return getApi(this.$store).updateRetro(retro_id, retro_name, new_slug, getApiToken(retro_id), is_private, request_uuid, video_link).then(([status, data]) => {
      if (status >= 200 && status < 400) {
        resetApiToken(old_slug, new_slug);
        this.dispatch({
          type: 'retroSettingsSuccessfullyUpdated',
          data: {retro: {name: retro_name, slug: new_slug, is_private: data.retro.is_private}},
        });
        this.dispatch({
          type: 'showAlert',
          data: {checkIcon: true, message: 'Settings saved!', className: 'alert-with-back-button'},
        });
      } else if (status === 403) {
        this.dispatch({type: 'requireRetroLogin', data: {retro_id}});
      } else if (status === 422) {
        this.dispatch({type: 'retroSettingsUnsuccessfullyUpdated', data});
      }
    });
  },
  updateRetroPassword({data: {retro_id, current_password, new_password, request_uuid}}) {
    Logger.info('updateRetroPassword');
    return getApi(this.$store).updateRetroPassword(retro_id, current_password, new_password, request_uuid, getApiToken(retro_id))
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
};
