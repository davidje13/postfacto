function getApiTokens(storage) {
  const result = {};

  const prefix = 'apiToken-';
  Object.keys(storage)
    .filter((key) => key.startsWith(prefix))
    .forEach((key) => {
      result[key.substr(prefix.length)] = storage.getItem(key);
    });

  return result;
}

export default {
  reloadLocalStorage() {
    this.$store.refine('localStorage').merge({
      hasAnyData: window.localStorage.length > 0,
      authToken: window.localStorage.getItem('authToken') || null,
      apiTokens: getApiTokens(window.localStorage),
      homeTermsDismissed: window.localStorage.getItem('homeTermsDismissed') === 'true',
      retroTermsDismissed: JSON.parse(window.localStorage.getItem('retroTermsDismissed') || '[]'),
    });
  },

  setAuthToken({data: {authToken}}) {
    localStorage.setItem('authToken', authToken);
    this.$store.refine('localStorage').merge({
      hasAnyData: true,
      authToken,
    });
  },

  setApiToken({data: {slug, apiToken}}) {
    localStorage.setItem('apiToken-' + slug, apiToken);
    this.$store.refine('localStorage', 'apiTokens', slug).set(apiToken);
    this.$store.refine('localStorage', 'loginsNeeded').remove(slug);
    this.$store.refine('localStorage').merge({
      hasAnyData: true,
    });
  },

  migrateApiToken({data: {oldSlug, newSlug}}) {
    const apiToken = this.$store.get('localStorage', 'apiTokens', oldSlug);
    console.log(oldSlug, newSlug, apiToken);

    localStorage.removeItem('apiToken-' + oldSlug);
    localStorage.setItem('apiToken-' + newSlug, apiToken);

    this.$store.refine('localStorage', 'apiTokens').remove(oldSlug);
    this.$store.refine('localStorage', 'apiTokens', newSlug).set(apiToken);
  },

  markRetroLoginNeeded({data: {slug, changed = false}}) {
    localStorage.removeItem('apiToken-' + slug);
    this.$store.refine('localStorage', 'apiTokens').remove(slug);
    this.$store.refine('localStorage', 'loginsNeeded', slug).set({login: true, changed});
  },

  setHomeTermsDismissed() {
    window.localStorage.setItem('homeTermsDismissed', 'true');
    this.$store.refine('localStorage').merge({
      homeTermsDismissed: true,
      hasAnyData: true,
    });
  },

  setRetroTermsDismissed({data: {slug}}) {
    this.$store.refine('localStorage', 'retroTermsDismissed').apply((retroTermsDismissed) => {
      if (retroTermsDismissed.includes(slug)) {
        return retroTermsDismissed;
      }
      const newDismissed = [...retroTermsDismissed, slug];
      window.localStorage.setItem('retroTermsDismissed', JSON.stringify(newDismissed));
      return newDismissed;
    });
    this.$store.refine('localStorage').merge({
      hasAnyData: true,
    });
  },

  clearLocalStorage() {
    window.localStorage.clear();
    this.$store.refine('localStorage').merge({
      hasAnyData: false,
      authToken: null,
      apiTokens: {},
      loginsNeeded: {},
      homeTermsDismissed: false,
      retroTermsDismissed: [],
    });
  },
};
