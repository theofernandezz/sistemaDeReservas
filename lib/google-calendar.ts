import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
)

// Scopes needed for calendar
const SCOPES = ['https://www.googleapis.com/auth/calendar.events']

/**
 * Generate the URL to redirect user for Google OAuth
 */
export function getGoogleAuthUrl(): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Force to get refresh token every time
  })
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Set credentials on the oauth client
 */
export function setCredentials(tokens: { access_token?: string | null, refresh_token?: string | null }) {
  oauth2Client.setCredentials(tokens)
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  refreshToken: string
}) {
  // Set up auth with the stored refresh token
  oauth2Client.setCredentials({
    refresh_token: params.refreshToken
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event = {
    summary: params.summary,
    description: params.description,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires'
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 }, // 1 hour before
        { method: 'popup', minutes: 15 }  // 15 min before
      ]
    }
  }

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event
  })

  return response.data
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string, refreshToken: string) {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: eventId
  })
}

export { oauth2Client }
