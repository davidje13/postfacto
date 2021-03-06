#
# Postfacto, a free, open-source and self-hosted retro tool aimed at helping
# remote teams.
#
# Copyright (C) 2016 - Present Pivotal Software, Inc.
#
# This program is free software: you can redistribute it and/or modify
#
# it under the terms of the GNU Affero General Public License as
#
# published by the Free Software Foundation, either version 3 of the
#
# License, or (at your option) any later version.
#
#
#
# This program is distributed in the hope that it will be useful,
#
# but WITHOUT ANY WARRANTY; without even the implied warranty of
#
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#
# GNU Affero General Public License for more details.
#
#
#
# You should have received a copy of the GNU Affero General Public License
#
# along with this program.  If not, see <https://www.gnu.org/licenses/>.
#
require 'rails_helper'
require 'clients/google_client'

describe '/sessions' do
  describe 'POST /' do
    context 'google login succeeds and user exists' do
      before do
        user_data = {
          name: 'Felicity Frog',
          email: 'felicity@frog.com',
          hd: 'frog.com'
        }

        expect(GOOGLE_CLIENT).to receive(:get_user!).with('the-access-token').and_return(user_data)

        @user = User.create!(name: 'Felicity Frog', email: 'felicity@frog.com')
      end

      it 'returns user details' do
        post '/sessions', params: { access_token: 'the-access-token' }, as: :json

        expect(response.status).to eq(200)

        data = JSON.parse(response.body, symbolize_names: true)
        expect(data[:auth_token]).to_not be_blank
        expect(data[:new_user]).to eq(true)
      end
    end

    context 'google login succeeeds and user has retro' do
      before do
        user_data = {
          name: 'Felicity Frog',
          email: 'felicity@frog.com',
          hd: 'frog.com'
        }

        expect(GOOGLE_CLIENT).to receive(:get_user!).with('the-access-token').and_return(user_data)

        @user = User.create!(name: 'Felicity Frog', email: 'felicity@frog.com')
        @user.retros.create!(name: 'Froggy Retro')
      end

      it 'returns user details' do
        post '/sessions', params: { access_token: 'the-access-token' }, as: :json

        expect(response.status).to eq(200)

        data = JSON.parse(response.body, symbolize_names: true)
        expect(data[:auth_token]).to_not be_blank
        expect(data[:new_user]).to eq(false)
      end
    end

    context 'google login succeeds and user doesn\'t exist' do
      before do
        user_data = {
          name: 'Felicity Frog',
          email: 'felicity@frog.com',
          hd: 'frog.com'
        }

        expect(GOOGLE_CLIENT).to receive(:get_user!).with('the-access-token').and_return(user_data)
      end

      it 'returns 404' do
        post '/sessions', params: { access_token: 'the-access-token' }, as: :json

        expect(response.status).to eq(404)
      end
    end

    context 'google login failure' do
      before do
        expect(GOOGLE_CLIENT).to receive(:get_user!)
          .with('invalid-access-token')
          .and_raise(GoogleClient::GetUserFailed.new)
      end

      it 'returns 500' do
        post '/sessions', params: { access_token: 'invalid-access-token' }, as: :json

        expect(response.status).to eq(500)
      end
    end

    context 'hosted domain is set' do
      it 'returns forbidden for out of domain accounts' do
        expect(GOOGLE_CLIENT).to receive(:get_user!)
          .with('the-access-token')
          .and_raise(GoogleClient::InvalidUserDomain.new)

        post '/sessions', params: { access_token: 'the-access-token' }, as: :json
        expect(response).to be_forbidden
      end

      it 'returns 404 for in domain accounts' do
        google_user_data = {
          name: 'Felicity Frog',
          email: 'felicity@frog.com',
          hd: 'frog.com'
        }

        expect(GOOGLE_CLIENT).to receive(:get_user!).with('the-access-token').and_return(google_user_data)

        post '/sessions', params: { access_token: 'the-access-token' }, as: :json
        expect(response).to be_not_found
      end
    end
  end
end
