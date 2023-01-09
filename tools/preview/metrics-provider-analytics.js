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

async function loadImsProfile(config) {
  return new Promise((resolve, reject) => {
    // See https://git.corp.adobe.com/IMS/imslib2.js for more details
    // and https://www.storyblok.com/faq/setup-dev-server-https-proxy for local development
    // to map the local dev server on the allow-listed https://localhost.corp.adobe.com:9000
    window.adobeid = {
      scope: 'AdobeID,openid',
      locale: 'en_US',
      environment: 'stg1',
      onAccessToken: ({ sid, token }) => {
        console.debug('[IMS] Session id', sid);
        console.debug('[IMS] Token', token);
      },
      onError: (err) => {
        reject(err);
      },
      onReady: async () => {
        let profile = null;
        if (window.adobeIMS.isSignedInUser()) {
          profile = await window.adobeIMS.getProfile();
          console.debug('[IMS] Profile', profile);
        }
        resolve(profile);
      },
      ...config,
    };
    addScript('https://auth-stg1.services.adobe.com/imslib/imslib.js')
      .catch((err) => reject(err));
  });
}

function decorateImsLoginButton(btn) {
  btn.classList.add('hlx-login-toggle');
  btn.addEventListener('click', () => {
    if (window.adobeIMS.isSignedInUser()) {
      window.adobeIMS.signOut();
    } else {
      window.adobeIMS.signIn();
    }
  });
  return btn;
}

export async function init(context) {
  // Authenticate if needed, and return the IMS profile. Also cleanup URL hash from auth flow
  const [, oldHash = ''] = window.location.hash.match(/old_hash=([^&]*)/) || [];
  await loadImsProfile({ client_id: 'IMSLibJSTestClient' });
  if (oldHash) {
    window.location.hash = oldHash;
  } else {
    window.history.replaceState(null, '', window.location.href.split('#')[0]);
  }

  // Add the IMS login button
  const { createButton, getOverlay } = context.plugins.preview;
  const imsLoginButton = decorateImsLoginButton(createButton(
    window.adobeIMS.isSignedInUser()
      ? 'IMS Logout'
      : 'IMS Login',
  ));
  getOverlay().append(imsLoginButton);
}

export async function getZoneMetrics(id) {
  return Math.random();
}
