/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

// FIXME: IMSLib fails when getting the access token as it doesn't pass along the client secret
// for the authorization code grant type.
const useImsLib = false;

async function addScript(url) {
  return new Promise((resolve, reject) => {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    scriptElement.onload = resolve;
    scriptElement.onerror = reject;
    scriptElement.onabort = reject;
    document.head.appendChild(scriptElement);
  });
}

async function initImsLib(config) {
  return new Promise((resolve, reject) => {
    // See https://git.corp.adobe.com/IMS/imslib2.js for more details
    // and https://www.storyblok.com/faq/setup-dev-server-https-proxy for local development
    // to map the local dev server on the allow-listed https://localhost.corp.adobe.com:9000
    window.adobeid = {
      scope: 'openid,AdobeID,read_organizations,additional_info.job_function,additional_info.projectedProductContext',
      locale: 'en_US',
      onError: (err) => {
        reject(err);
      },
      onReady: resolve,
      ...config,
    };
    addScript('https://auth.services.adobe.com/imslib/imslib.min.js') // prod
      .catch((err) => reject(err));
  });
}

function getToken() {
  return window.localStorage.getItem('imsToken');
}

function isSignedIn() {
  return useImsLib ? window.adobeIMS.isSignedInUser() : !!getToken();
}

function authorize(clientId) {
  const imsHost = 'https://adobeid-na1.services.adobe.com';
  const pathName = '/ims/authorize';
  const usp = new URLSearchParams();
  usp.append('client_id', clientId);
  usp.append('redirect_uri', window.location.origin);
  usp.append('response_type', 'code');
  usp.append('scope', [
    'openid',
    'AdobeID',
    'read_organizations',
    'additional_info.job_function',
    'additional_info.projectedProductContext',
  ].join(','));
  window.location.replace(`${imsHost}${pathName}?${usp.toString()}`);
}

async function getTokenFromCode(clientId, clientSecret, code) {
  const usp = new URLSearchParams(window.location.search);
  usp.delete('code');
  const suffix = usp.toString().length ? `?${usp.toString()}` : '';
  window.history.replaceState({}, '', `${window.location.pathname}${suffix}`);

  const imsHost = 'https://adobeid-na1.services.adobe.com';
  const pathName = '/ims/token/v3';

  const data = Object.entries({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
  }).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
  const response = await fetch(`${imsHost}${pathName}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      client_id: clientId,
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: data,
  });
  const json = await response.json();
  window.localStorage.setItem('imsToken', json.access_token);
}

async function signIn(clientId) {
  if (useImsLib) {
    return window.adobeIMS.signIn({}, {}, 'code');
  }
  return authorize(clientId);
}

async function signOut(clientId) {
  if (useImsLib) {
    return window.adobeIMS.signOut();
  }
  const imsHost = 'https://adobeid-na1.services.adobe.com';
  const pathName = '/ims/logout/v1';
  const usp = new URLSearchParams();
  usp.append('client_id', clientId);
  usp.append('redirect_uri', window.location.origin);
  window.location.replace(`${imsHost}${pathName}?${usp.toString()}`);
  return null;
}

async function getProfile(clientId) {
  if (useImsLib) {
    return window.adobeIMS.getProfile();
  }
  const imsHost = 'https://adobeid-na1.services.adobe.com';
  const pathName = '/ims/profile/v1';
  const usp = new URLSearchParams();
  usp.append('client_id', clientId);
  const response = await fetch(`${imsHost}${pathName}?${usp.toString()}`, {
    headers: {
      authorization: `Bearer ${getToken()}`,
      client_id: clientId,
    },
  });
  return response.json();
}

function decorateLoginButton(btn, clientId) {
  btn.classList.add('hlx-login-toggle');
  btn.addEventListener('click', async () => {
    if (isSignedIn()) {
      await signOut(clientId);
    } else {
      await signIn(clientId);
    }
  });
  return btn;
}

export async function init(context) {
  const clientId = 'aaf738e04ac84201987b0f712e25f140';
  const clientSecret = 'p8e--om6TjLSeY3qdJ8Yt3wSlc_isFjUURqf'; // TODO: need to rotate this at some point

  // Authenticate if needed, and return the IMS profile. Also cleanup URL hash from auth flow
  if (useImsLib) {
    await initImsLib({ client_id: clientId });
  }

  // Finish the auth flow when not using imslib
  if (!useImsLib && !isSignedIn()) {
    const usp = new URLSearchParams(window.location.search);
    const code = usp.get('code');
    if (code) {
      try {
        await getTokenFromCode(clientId, clientSecret, code);
      } catch (err) {
        console.error(err);
      }
    }
  }

  if (isSignedIn()) {
    // Fetch the IMS user profile
    const profile = await getProfile(clientId);
    console.log('[IMS] Profile:', profile);

    // Fetch the AA user profile
    const productContext = profile.projectedProductContext
      .find((c) => c.prodCtx.serviceCode === 'dma_analytics' && c.prodCtx.statusCode === 'ACTIVE');
    const companyId = productContext.prodCtx.global_company_id;

    const response = await fetch(`https://analytics.adobe.io/api/${companyId}/users/me`, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${getToken()}`,
        'x-api-key': clientId,
      },
    });
    const json = await response.json();
    console.log('[AA] Profile:', json);
  }

  // Add the IMS login button
  const { createButton, getOverlay } = context.plugins.preview;
  // FIXME: we probably want to merge back the login into the regular heatmap toggle once
  // everything is working
  const imsLoginButton = decorateLoginButton(createButton(
    isSignedIn()
      ? 'IMS Logout'
      : 'IMS Login',
  ), clientId);
  getOverlay().append(imsLoginButton);
}

export async function getZoneMetrics(id) {
  // TODO: need to connect this to the Analytics API v2 metrics
  return Math.random();
}
