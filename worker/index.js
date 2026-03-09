const ALLOWED_ORIGIN = 'https://justmarks.github.io'
const BGG_ORIGIN = 'https://boardgamegeek.com'
const ALLOWED_PATHS = ['/login/api/v1', '/geekplay.php']

export default {
  async fetch(request) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    if (!ALLOWED_PATHS.includes(url.pathname)) {
      return new Response('Not found', { status: 404 })
    }

    const upstreamHeaders = new Headers()
    upstreamHeaders.set('Content-Type', request.headers.get('Content-Type') ?? 'application/json')
    const session = request.headers.get('X-BGG-Session')
    if (session) upstreamHeaders.set('Cookie', session)

    const upstream = await fetch(BGG_ORIGIN + url.pathname, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.body,
    })

    const resHeaders = corsHeaders()
    const ct = upstream.headers.get('Content-Type')
    if (ct) resHeaders.set('Content-Type', ct)

    // Relay BGG session cookies back to the client as a single custom header
    const setCookies = upstream.headers.getAll('set-cookie')
    if (setCookies.length > 0) {
      resHeaders.set('X-BGG-Session', setCookies.map(c => c.split(';')[0]).join('; '))
    }

    return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
  },
}

function corsHeaders() {
  return new Headers({
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-BGG-Session',
    'Access-Control-Expose-Headers': 'X-BGG-Session',
    'Access-Control-Max-Age': '86400',
  })
}
