import {useEffect, useRef} from 'react';

import {Client} from 'sentry/api';

type Options = {
  /**
   * Enabling this option will disable clearing in-flight requests when the
   * component is unmounted.
   *
   * This may be useful in situations where your component needs to finish up
   * somewhere the client was passed into some type of action creator and the
   * component is unmounted.
   */
  persistInFlight?: boolean;
  /**
   * An existing API client may be provided.
   *
   * This is a continent way to re-use clients and still inherit the
   * persistInFlight configuration.
   */
  api?: Client;
};

/**
 * Returns an API client that will have it's requests canceled when the owning
 * React component is unmounted (may be disabled via options).
 */
function useApi({persistInFlight, api: providedApi}: Options = {}) {
  const localApi = useRef<Client>();

  // Lazily construct the client if we weren't provided with one
  if (localApi.current === undefined && providedApi === undefined) {
    localApi.current = new Client();
  }

  // Use the provided client if available
  const api = providedApi ?? localApi.current!;

  function handleCleanup() {
    !persistInFlight && api.clear();
  }

  useEffect(() => handleCleanup, []);

  return api;
}

export default useApi;
