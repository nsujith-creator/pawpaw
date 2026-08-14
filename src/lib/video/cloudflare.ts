type CloudflareResult<T> = { success: boolean; result?: T }
const MAX_DURATION_SECONDS = 600
// Account IDs identify a Cloudflare account but are not credentials. Keeping it
// here avoids placing a second configuration value in the deployment platform.
const ACCOUNT_ID = '75d5d9018ab32f763e3f9b48a6f5e1e2'
function config() { const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN; if (!apiToken) throw new Error('Cloudflare Stream is not configured'); return { accountId: ACCOUNT_ID, apiToken } }
function authHeaders(token: string) { return { Authorization: `Bearer ${token}` } }
export async function createPrivateTusUpload(size: number, fileName: string) {
  const { accountId, apiToken } = config(); const expiry = new Date(Date.now() + 3_600_000).toISOString()
  const encoded = (value: string) => Buffer.from(value).toString('base64')
  const metadata = [`filename ${encoded(fileName)}`, `maxDurationSeconds ${encoded(String(MAX_DURATION_SECONDS))}`, 'requiresignedurls', `expiry ${encoded(expiry)}`].join(',')
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream?direct_user=true`, { method: 'POST', headers: { ...authHeaders(apiToken), 'Tus-Resumable': '1.0.0', 'Upload-Length': String(size), 'Upload-Metadata': metadata } })
  const uploadUrl = response.headers.get('location'); const cloudflareUid = uploadUrl?.split('/').filter(Boolean).at(-1)
  if (!response.ok || !uploadUrl || !cloudflareUid) throw new Error('Cloudflare Stream did not create an upload')
  return { uploadUrl, cloudflareUid }
}
export async function getVideoState(cloudflareUid: string) {
  const { accountId, apiToken } = config(); const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareUid}`, { headers: authHeaders(apiToken), cache: 'no-store' })
  const body = await response.json() as CloudflareResult<{ readyToStream?: boolean; duration?: number; status?: { state?: string } }>
  if (!response.ok || !body.success || !body.result) throw new Error('Cloudflare Stream could not read the video')
  return { status: body.result.readyToStream ? 'ready' : body.result.status?.state === 'error' ? 'errored' : 'processing', durationSeconds: body.result.duration ?? null }
}
export async function createPrivatePlayerUrl(cloudflareUid: string) {
  const { accountId, apiToken } = config(); const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareUid}/token`, { method: 'POST', headers: { ...authHeaders(apiToken), 'Content-Type': 'application/json' }, body: JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300, downloadable: false }), cache: 'no-store' })
  const body = await response.json() as CloudflareResult<{ token?: string }>
  if (!response.ok || !body.success || !body.result?.token) throw new Error('Cloudflare Stream could not create private playback')
  const embedResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${cloudflareUid}/embed`, { headers: authHeaders(apiToken), cache: 'no-store' })
  const embed = await embedResponse.json() as CloudflareResult<string>
  const origin = typeof embed.result === 'string' && embed.result.match(/https:\/\/customer-[^/]+\.cloudflarestream\.com/)
  if (!embedResponse.ok || !embed.success || !origin) throw new Error('Cloudflare Stream could not prepare private playback')
  return `${origin[0]}/${body.result.token}/iframe`
}
export const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm'
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
