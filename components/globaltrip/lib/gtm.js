const GTM_ID = process.env.NEXT_PUBLIC_GLOBALTRIP_GTM_ID;

let lastTrackedPagePath = null;

const isBrowser = () => typeof window !== 'undefined';

export const isGtmEnabled = () => Boolean(GTM_ID);

const ensureDataLayer = () => {
  if (!isBrowser()) {
    return null;
  }

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  return window.dataLayer;
};

const getCurrentPath = () => {
  if (!isBrowser()) {
    return '';
  }

  return window.location.pathname;
};

const getCurrentTitle = () => {
  if (typeof document === 'undefined') {
    return '';
  }

  return document.title;
};

export const pushToDataLayer = (payload) => {
  if (!isGtmEnabled()) {
    return false;
  }

  const dataLayer = ensureDataLayer();

  if (!dataLayer || !payload || typeof payload !== 'object') {
    return false;
  }

  dataLayer.push(payload);
  return true;
};

export const trackPageView = ({ path = getCurrentPath(), title = getCurrentTitle() } = {}) => {
  if (!path || path === lastTrackedPagePath) {
    return false;
  }

  const wasTracked = pushToDataLayer({
    event: 'page_view',
    path,
    title,
    location: 'route_change',
  });

  if (wasTracked) {
    lastTrackedPagePath = path;
  }

  return wasTracked;
};

export const trackEvent = (name, params = {}) => {
  if (!name) {
    return false;
  }

  return pushToDataLayer({
    event: name,
    path: params.path ?? getCurrentPath(),
    ...params,
  });
};
