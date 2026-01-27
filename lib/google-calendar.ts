import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
)

// Scopes needed for calendar
const SCOPES: string[] = ['https://www.googleapis.com/auth/calendar.events']

interface GoogleTokens {
  access_token?: string | null
  refresh_token?: string | null
}

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
export async function getTokensFromCode(code: string): Promise<GoogleTokens> {
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

/**
 * Set credentials on the oauth client
 */
export function setCredentials(tokens: GoogleTokens): void {
  oauth2Client.setCredentials(tokens)
}

interface CreateCalendarEventParams {
  summary: string
  description?: string
  startTime: Date
  endTime: Date
  refreshToken: string
}

/**
 * Create a calendar event
 */
export async function createCalendarEvent(
  params: CreateCalendarEventParams
): Promise<calendar_v3.Schema$Event> {
  // Set up auth with the stored refresh token
  oauth2Client.setCredentials({
    refresh_token: params.refreshToken
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event: calendar_v3.Schema$Event = {
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

interface UpdateCalendarEventParams {
  startTime: Date
  endTime: Date
  summary?: string
  description?: string
}

/**
 * Update a calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  params: UpdateCalendarEventParams,
  refreshToken: string
): Promise<calendar_v3.Schema$Event> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  const event: calendar_v3.Schema$Event = {
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires'
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: 'America/Argentina/Buenos_Aires'
    }
  }

  if (params.summary) {
    event.summary = params.summary
  }

  if (params.description) {
    event.description = params.description
  }

  const response = await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: event
  })

  return response.data
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string, refreshToken: string): Promise<void> {
  oauth2Client.setCredentials({
    refresh_token: refreshToken
  })

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId
  })
}

export { oauth2Client }
