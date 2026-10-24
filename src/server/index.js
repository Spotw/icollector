const UNIFIED_SITE = 'https://myweb.duyvu2003dk.workers.dev';

export default {
  async fetch(request) {
    const target = new URL(request.url);
    const unifiedSite = new URL(UNIFIED_SITE);
    target.protocol = unifiedSite.protocol;
    target.hostname = unifiedSite.hostname;
    target.port = unifiedSite.port;
    return Response.redirect(target.toString(), 307);
  }
};
