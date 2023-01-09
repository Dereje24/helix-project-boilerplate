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

let data = [];
let total = 0;

function isProd(url) {
  return url.hostname !== 'localhost'
    && url.hostname !== 'localhost.corp.adobe.com'
    && !url.hostname.endsWith('.hlx.page');
}

export async function init({ url }) {
  // FIXME: for demo purposes while we don't have any real data
  if (!isProd(new URL(url))) {
    return;
  }

  const serviceUrl = 'https://helix-pages.anywhere.run/helix-services/run-query@v2/';
  const queryName = 'rum-sources';

  const filters = new URLSearchParams();
  filters.append('checkpoint', 'click');
  filters.append('url', url.replace(/https?:\/\//, ''));
  filters.append('limit', 100);

  const response = await fetch(`${serviceUrl}${queryName}?${filters.toString()}`);
  if (!response.ok) {
    return;
  }
  const json = await response.json();
  data = json.results.filter((entry) => entry.topurl === window.location.href);
  total = data.reduce((sum, entry) => sum + Number(entry.actions), 0);
}

export async function getZoneMetrics(id) {
  // FIXME: for demo purposes while we don't have any real data
  if (!data.length && !total) {
    return Math.random();
  }
  const entry = data.find((e) => e.source === id);
  return entry ? Number(entry.actions) / total : 0;
}
