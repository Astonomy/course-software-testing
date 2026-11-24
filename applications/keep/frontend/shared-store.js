// Shared domain state; keep authentication/session UI in browser storage.
const structuredPrefix = '\u001eLingCoreJSON1:';
export const sharedStore = {
  getItem(key) {
    const request = new XMLHttpRequest();
    request.open('GET', '/api/state/' + encodeURIComponent(key), false);
    request.send();
    if(request.status !== 200) throw new Error('Cannot load shared data');
    const value = JSON.parse(request.responseText).value;
    return typeof value === 'string' && value.startsWith(structuredPrefix)
      ? JSON.parse(value.slice(structuredPrefix.length)) : value;
  },
  setItem(key, value) {
    const request = new XMLHttpRequest();
    request.open('PUT', '/api/state/' + encodeURIComponent(key), false);
    request.setRequestHeader('Content-Type','application/json');
    const stored = value === null || (typeof value === 'string' && !value.startsWith(structuredPrefix))
      ? value : structuredPrefix + JSON.stringify(value);
    if (stored === undefined || stored === structuredPrefix + undefined)
      throw new TypeError('Shared data must be JSON serializable');
    request.send(JSON.stringify({value: stored}));
    if(request.status !== 200) throw new Error('Cannot save shared data');
  }
};
