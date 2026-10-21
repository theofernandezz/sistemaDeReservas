import { Resend } from 'resend'
import { createClient } from '@/utils/supabase/server'
import { getAppUrl } from '@/lib/config'
import { escapeHtml } from '@/lib/html'
import { buildManageUrl } from '@/lib/manage-token'
import { hasPaymentToResolve } from '@/lib/appointment-rules'

let resendClient: Resend | null = null

// Lazy singleton: constructing Resend without an API key throws immediately,
// which would break module import (and next build's page-data collection)
// in any environment where RESEND_API_KEY isn't set yet.
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Default brand settings
const DEFAULT_BRAND_COLOR = '#6366f1'
const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_MAIL || 'reservas@example.com'
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_MAIL || ''
const DEFAULT_FROM_NAME = 'Sistema de Reservas'

/**
 * Business email configuration
 */
export interface BusinessEmailConfig {
  emailFrom: string
  emailFromName: string
  adminNotificationEmail: string
  brandColor: string
  brandName: string
}

/**
 * Appointment email data
 */
export interface AppointmentEmailData {
  id: string
  clientName: string
  clientPhone?: string
  clientEmail?: string
  serviceName: string
  servicePrice: number
  date: string
  time: string
  startDateTime?: Date
  endDateTime?: Date
  /** Clear manage token: only available at creation time / resend. Without it the client link falls back to /cancel/{id} (resend page). */
  manageToken?: string
}

export interface PasswordResetEmailData {
  email: string
  resetLink: string
}

export interface AppointmentCancellationEmailData {
  businessId: string
  serviceName?: string | null
  clientName: string
  clientEmail?: string | null
  startTime: string
  reason: string
  paymentStatus?: string | null
  paymentAmount?: number | null
}

export interface AppointmentRescheduleEmailData {
  businessId: string
  serviceName?: string | null
  clientName: string
  clientEmail?: string | null
  oldStartTime: string
  newStartTime: string
  manageToken?: string
}

export interface ManageLinkEmailData {
  businessId: string
  clientName: string
  clientEmail: string
  serviceName?: string | null
  startTime: string
  manageToken: string
}

/**
 * Get email configuration for a business
 */
export async function getBusinessEmailConfig(businessId: string): Promise<BusinessEmailConfig> {
  const supabase = await createClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select('name, email_from, email_from_name, admin_notification_email, email_brand_color')
    .eq('id', businessId)
    .single()

  if (error || !business) {
    return {
      emailFrom: DEFAULT_FROM_EMAIL,
      emailFromName: 'Sistema de Reservas',
      adminNotificationEmail: DEFAULT_ADMIN_EMAIL,
      brandColor: DEFAULT_BRAND_COLOR,
      brandName: 'Sistema de Reservas',
    }
  }

  return {
    emailFrom: business.email_from || DEFAULT_FROM_EMAIL,
    emailFromName: business.email_from_name || business.name,
    adminNotificationEmail: business.admin_notification_email || DEFAULT_ADMIN_EMAIL,
    brandColor: business.email_brand_color || DEFAULT_BRAND_COLOR,
    brandName: business.name,
  }
}

/**
 * Get business email config using business slug (for public pages)
 */
export async function getBusinessEmailConfigBySlug(slug: string): Promise<BusinessEmailConfig> {
  const supabase = await createClient()

  const { data: business, error } = await supabase
    .from('businesses')
    .select('name, email_from, email_from_name, admin_notification_email, email_brand_color')
    .eq('slug', slug)
    .single()

  if (error || !business) {
    return {
      emailFrom: DEFAULT_FROM_EMAIL,
      emailFromName: 'Sistema de Reservas',
      adminNotificationEmail: DEFAULT_ADMIN_EMAIL,
      brandColor: DEFAULT_BRAND_COLOR,
      brandName: 'Sistema de Reservas',
    }
  }

  return {
    emailFrom: business.email_from || DEFAULT_FROM_EMAIL,
    emailFromName: business.email_from_name || business.name,
    adminNotificationEmail: business.admin_notification_email || DEFAULT_ADMIN_EMAIL,
    brandColor: business.email_brand_color || DEFAULT_BRAND_COLOR,
    brandName: business.name,
  }
}

// ─── Shared template shell ────────────────────────────────────────────────────

/**
 * Universal email wrapper — dark header with brand accent line, white body, light footer.
 * Works for any business type: medical, beauty, fitness, legal, etc.
 */
export function baseEmailTemplate({
  brandName,
  brandColor,
  title,
  subtitle,
  body,
  footerText,
}: {
  brandName: string
  brandColor: string
  title: string
  subtitle?: string
  body: string
  footerText?: string
}): string {
  const year = new Date().getFullYear()
  // Callers pass raw text (client/business-controlled); escape once here.
  brandName = escapeHtml(brandName)
  title = escapeHtml(title)
  subtitle = subtitle === undefined ? undefined : escapeHtml(subtitle)
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f3f4f6; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background-color: #111827; padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding: 28px 32px 20px;">
                        <p style="margin: 0 0 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; color: ${brandColor};">${brandName}</p>
                        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #f9fafb; letter-spacing: -0.3px; line-height: 1.3;">${title}</h1>
                        ${subtitle ? `<p style="margin: 8px 0 0; font-size: 14px; color: #9ca3af; line-height: 1.5;">${subtitle}</p>` : ''}
                      </td>
                    </tr>
                    <!-- Brand color accent bar -->
                    <tr>
                      <td style="height: 3px; background-color: ${brandColor};"></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding: 32px;">
                  ${body}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 20px 32px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                    ${footerText ?? `${footerText ?? ''}`}
                    &copy; ${year} ${brandName}. Todos los derechos reservados.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

// ─── Shared UI blocks ─────────────────────────────────────────────────────────

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
        <p style="margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">${label}</p>
        <p style="margin: 4px 0 0; font-size: 15px; color: #111827;">${escapeHtml(value)}</p>
      </td>
    </tr>
  `
}

function infoCard(rows: string, brandColor: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; border-left: 3px solid ${brandColor}; padding: 20px 24px; margin-bottom: 24px;">
      <tr><td style="padding: 0 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
        </table>
      </td></tr>
    </table>
  `
}

function primaryButton(text: string, url: string, brandColor: string): string {
  return `
    <a href="${url}" target="_blank"
       style="display: inline-block; padding: 12px 24px; background-color: ${brandColor}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: -apple-system, 'Segoe UI', sans-serif; letter-spacing: 0.1px;">
      ${text}
    </a>
  `
}

function ghostButton(text: string, url: string): string {
  return `
    <a href="${url}" target="_blank"
       style="display: inline-block; padding: 11px 20px; background-color: #ffffff; color: #374151; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; font-family: -apple-system, 'Segoe UI', sans-serif; border: 1px solid #d1d5db;">
      ${text}
    </a>
  `
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AR_TZ = 'America/Argentina/Buenos_Aires'

function formatDate(value: string, locale: string = 'es-AR'): string {
  return new Date(value).toLocaleDateString(locale, { timeZone: AR_TZ })
}

function formatTime(value: string, locale: string = 'es-AR'): string {
  return new Date(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: AR_TZ })
}

function generateGoogleCalendarLink(data: AppointmentEmailData): string {
  if (!data.startDateTime || !data.endDateTime) return ''
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent(data.serviceName + ' - ' + data.clientName) +
    '&dates=' + fmt(data.startDateTime) + '/' + fmt(data.endDateTime) +
    '&details=' + encodeURIComponent('Cliente: ' + data.clientName + (data.clientPhone ? '\nTel: ' + data.clientPhone : ''))
}

function clientManageUrl(appUrl: string, data: { id: string; manageToken?: string }): string {
  return data.manageToken ? buildManageUrl(appUrl, data.manageToken) : `${appUrl}/cancel/${data.id}`
}

// ─── Email senders ────────────────────────────────────────────────────────────

export async function sendPasswordResetEmailViaResend(
  data: PasswordResetEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const body = `
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
        Recibimos una solicitud para restablecer la contrasena de tu cuenta. Haz clic en el boton para crear una nueva contrasena.
      </p>
      <div style="margin-bottom: 28px;">
        ${primaryButton('Restablecer contrasena', data.resetLink, DEFAULT_BRAND_COLOR)}
      </div>
      <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.7; word-break: break-all;">
        Si el boton no funciona, copia y pega este enlace en tu navegador:<br/>
        <a href="${data.resetLink}" target="_blank" style="color: ${DEFAULT_BRAND_COLOR}; text-decoration: none;">${data.resetLink}</a>
      </p>
      <div style="margin-top: 24px; padding: 16px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
        <p style="margin: 0; font-size: 13px; color: #92400e;">
          Si no solicitaste este cambio, puedes ignorar este correo. Tu cuenta permanece segura.
        </p>
      </div>
    `

    const html = baseEmailTemplate({
      brandName: DEFAULT_FROM_NAME,
      brandColor: DEFAULT_BRAND_COLOR,
      title: 'Restablecer contrasena',
      subtitle: 'Este enlace expira pronto por razones de seguridad.',
      body,
    })

    const { error } = await getResendClient().emails.send({
      from: `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`,
      to: data.email,
      subject: 'Restablecer contrasena',
      html,
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error sending password reset email',
    }
  }
}

export async function sendAppointmentCancellationEmails(
  data: AppointmentCancellationEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const [config, { data: businessSlugData }] = await Promise.all([
      getBusinessEmailConfig(data.businessId),
      supabase.from('businesses').select('slug').eq('id', data.businessId).single(),
    ])

    if (!config.adminNotificationEmail) {
      return { success: false, error: 'Admin email not configured' }
    }

    const appUrl = getAppUrl()
    const rebookUrl = businessSlugData?.slug ? `${appUrl}/${businessSlugData.slug}` : appUrl

    // Admin email
    const adminRows =
      infoRow('Servicio', data.serviceName ?? 'Sin servicio') +
      infoRow('Cliente', data.clientName) +
      infoRow('Fecha original', `${formatDate(data.startTime)} a las ${formatTime(data.startTime)}hs`) +
      infoRow('Motivo de cancelacion', data.reason)

    const paymentWarning = hasPaymentToResolve({
      paymentStatus: data.paymentStatus ?? null,
      paymentAmount: data.paymentAmount ?? null,
    })
      ? `
      <div style="margin-bottom: 24px; padding: 16px; background-color: #fffbeb; border-radius: 8px; border: 1px solid #fde68a;">
        <p style="margin: 0; font-size: 14px; font-weight: 700; color: #92400e;">Este turno tenia un pago o sena${data.paymentAmount ? ` de $${escapeHtml(data.paymentAmount)}` : ''}${data.paymentStatus ? ` (estado: ${escapeHtml(data.paymentStatus)})` : ''}.</p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #92400e; line-height: 1.6;">No se reembolsa automaticamente. Tenes que gestionarlo manualmente con el cliente.</p>
      </div>`
      : ''

    const adminBody = `
      <div style="display: inline-block; padding: 6px 14px; background-color: #fee2e2; border-radius: 20px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 1px;">Turno Cancelado</p>
      </div>
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
        Un cliente ha cancelado su turno. A continuacion se detallan los datos:
      </p>
      ${infoCard(adminRows, '#ef4444')}
      ${paymentWarning}
      <div>
        ${ghostButton('Ver en el panel', `${appUrl}/dashboard`)}
      </div>
    `

    let errorMessage: string | undefined

    const adminResult = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: config.adminNotificationEmail,
      subject: `Cancelacion: ${data.clientName} — ${data.serviceName ?? 'Turno'}`,
      html: baseEmailTemplate({
        brandName: config.brandName,
        brandColor: config.brandColor,
        title: 'Cancelacion de turno',
        body: adminBody,
      }),
    })

    if (adminResult.error) errorMessage = adminResult.error.message

    // Client email
    if (data.clientEmail) {
      const clientRows =
        infoRow('Servicio', data.serviceName ?? 'Sin servicio') +
        infoRow('Fecha', formatDate(data.startTime)) +
        infoRow('Hora', `${formatTime(data.startTime)}hs`)

      const clientBody = `
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
          Hola ${escapeHtml(data.clientName)}, te confirmamos que tu turno fue cancelado exitosamente.
        </p>
        ${infoCard(clientRows, '#ef4444')}
        <div style="margin-bottom: 24px;">
          ${primaryButton('Reservar nuevo turno', rebookUrl, config.brandColor)}
        </div>
        <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
          Si cancelaste por error o queres elegir otro horario, podés reservar nuevamente desde el boton de arriba.
        </p>
      `

      const clientResult = await getResendClient().emails.send({
        from: `${config.emailFromName} <${config.emailFrom}>`,
        to: data.clientEmail,
        subject: `Tu turno fue cancelado — ${data.serviceName ?? config.brandName}`,
        html: baseEmailTemplate({
          brandName: config.brandName,
          brandColor: config.brandColor,
          title: 'Turno cancelado',
          subtitle: 'Tu reserva fue cancelada correctamente.',
          body: clientBody,
        }),
      })

      if (clientResult.error && !errorMessage) errorMessage = clientResult.error.message
    }

    if (errorMessage) return { success: false, error: errorMessage }
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error sending cancellation email',
    }
  }
}

export async function sendAppointmentRescheduleEmails(
  data: AppointmentRescheduleEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getBusinessEmailConfig(data.businessId)

    if (!config.adminNotificationEmail) {
      return { success: false, error: 'Admin email not configured' }
    }

    const oldDate = new Date(data.oldStartTime)
    const newDate = new Date(data.newStartTime)

    const fmtDate = (d: Date) => d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: AR_TZ })
    const fmtTime = (d: Date) => d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: AR_TZ })

    // Admin email
    const adminRows =
      infoRow('Servicio', data.serviceName ?? 'Sin servicio') +
      infoRow('Cliente', data.clientName) +
      `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
        <p style="margin: 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Fecha anterior</p>
        <p style="margin: 4px 0 0; font-size: 15px; color: #9ca3af; text-decoration: line-through;">${fmtDate(oldDate)} — ${fmtTime(oldDate)}hs</p>
      </td></tr>` +
      infoRow('Nueva fecha', `${fmtDate(newDate)} — ${fmtTime(newDate)}hs`)

    const adminBody = `
      <div style="display: inline-block; padding: 6px 14px; background-color: #dbeafe; border-radius: 20px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 1px;">Turno Reprogramado</p>
      </div>
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
        Un cliente ha reprogramado su turno. A continuacion se detallan los cambios:
      </p>
      ${infoCard(adminRows, config.brandColor)}
    `

    let errorMessage: string | undefined

    const adminResult = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: config.adminNotificationEmail,
      subject: `Reprogramacion: ${data.clientName} — ${data.serviceName ?? 'Turno'}`,
      html: baseEmailTemplate({
        brandName: config.brandName,
        brandColor: config.brandColor,
        title: 'Turno reprogramado',
        body: adminBody,
      }),
    })

    if (adminResult.error) errorMessage = adminResult.error.message

    // Client email
    if (data.clientEmail) {
      const clientRows =
        infoRow('Servicio', data.serviceName ?? 'Sin servicio') +
        infoRow('Nueva fecha', `${fmtDate(newDate)}`) +
        infoRow('Hora', `${fmtTime(newDate)}hs`)

      const clientBody = `
        <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
          Hola ${escapeHtml(data.clientName)}, tu turno ha sido reprogramado exitosamente. Aqui estan los nuevos detalles:
        </p>
        ${infoCard(clientRows, config.brandColor)}
        ${data.manageToken ? `<div style="margin-bottom: 24px;">${ghostButton('Gestionar mi turno', buildManageUrl(getAppUrl(), data.manageToken))}</div>` : ''}
        <p style="margin: 0; font-size: 14px; color: #6b7280;">
          Si tienes alguna pregunta, no dudes en contactarnos.
        </p>
      `

      const clientResult = await getResendClient().emails.send({
        from: `${config.emailFromName} <${config.emailFrom}>`,
        to: data.clientEmail,
        subject: `Tu turno fue reprogramado — ${newDate.toLocaleDateString('es-AR')}`,
        html: baseEmailTemplate({
          brandName: config.brandName,
          brandColor: config.brandColor,
          title: 'Turno reprogramado',
          subtitle: 'Tu solicitud de reprogramacion fue procesada.',
          body: clientBody,
        }),
      })

      if (clientResult.error && !errorMessage) errorMessage = clientResult.error.message
    }

    if (errorMessage) return { success: false, error: errorMessage }
    return { success: true }
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error sending reschedule emails',
    }
  }
}

/**
 * Send notification to admin when a new appointment is created
 */
export async function sendNewAppointmentNotification(
  data: AppointmentEmailData,
  businessId: string,
  targetEmail?: string
) {
  try {
    const config = await getBusinessEmailConfig(businessId)
    const emailToUse = targetEmail || config.adminNotificationEmail

    if (!emailToUse) {
      console.warn('Admin email not configured, skipping email notification')
      return { success: false, error: 'Admin email not configured' }
    }

    const appUrl = getAppUrl()
    const googleCalendarUrl = generateGoogleCalendarLink(data)
    const dashboardUrl = `${appUrl}/dashboard`

    const contactRows = [
      data.clientPhone
        ? `<tr><td style="padding: 4px 0; font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Telefono:</strong> <a href="tel:${escapeHtml(data.clientPhone)}" style="color: ${config.brandColor}; text-decoration: none;">${escapeHtml(data.clientPhone)}</a></td></tr>`
        : '',
      data.clientEmail
        ? `<tr><td style="padding: 4px 0; font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Email:</strong> <a href="mailto:${escapeHtml(data.clientEmail)}" style="color: ${config.brandColor}; text-decoration: none;">${escapeHtml(data.clientEmail)}</a></td></tr>`
        : '',
    ].join('')

    const rows =
      infoRow('Servicio', `${data.serviceName} — $${data.servicePrice}`) +
      infoRow('Fecha', data.date) +
      infoRow('Hora', data.time) +
      infoRow('Cliente', data.clientName)

    const calendarBtn = (data.startDateTime && data.endDateTime)
      ? `<div style="margin-bottom: 12px;">${primaryButton('Agregar a Google Calendar', googleCalendarUrl, config.brandColor)}</div>`
      : ''

    const body = `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
        Se ha registrado una nueva reserva en tu sistema.
      </p>
      ${infoCard(rows, config.brandColor)}

      ${contactRows ? `
        <table style="width: 100%; margin-bottom: 24px;" cellpadding="0" cellspacing="0" border="0">
          ${contactRows}
        </table>
      ` : ''}

      <div style="margin-bottom: 8px;">
        ${calendarBtn}
      </div>
      <div>
        ${ghostButton('Ver en el panel', dashboardUrl)}
      </div>
    `

    const html = baseEmailTemplate({
      brandName: config.brandName,
      brandColor: config.brandColor,
      title: 'Nueva reserva recibida',
      subtitle: `${data.clientName} reservo un turno.`,
      body,
    })

    const { error } = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: emailToUse,
      subject: `Nueva reserva — ${data.serviceName} · ${data.clientName}`,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Error sending notification:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error sending notification' }
  }
}

/**
 * Send pending payment email to client for manual transfer bookings.
 * Includes a link to /reserva/[token] so they can upload the proof later.
 */
export async function sendManualTransferPendingEmail(
  data: AppointmentEmailData & {
    startDateTime: Date
    endDateTime: Date
  },
  businessId: string
) {
  if (!data.clientEmail) {
    return { success: false, error: 'No client email' }
  }

  try {
    const config = await getBusinessEmailConfig(businessId)
    const appUrl = getAppUrl()
    // The upload page needs the signed token; without it fall back to the resend page (/cancel/{id})
    const uploadUrl = data.manageToken ? `${appUrl}/reserva/${data.manageToken}` : `${appUrl}/cancel/${data.id}`

    const rows =
      infoRow('Servicio', data.serviceName) +
      infoRow('Fecha', data.date) +
      infoRow('Hora', data.time) +
      infoRow('Total', `$${data.servicePrice}`)

    const cancelUrl = clientManageUrl(appUrl, data)

    const body = `
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hola ${escapeHtml(data.clientName)}, tu turno está confirmado. Para evitar inconvenientes, te pedimos que realices la transferencia y subas el comprobante.
      </p>
      ${infoCard(rows, config.brandColor)}
      <div style="margin-bottom: 12px;">
        ${primaryButton('Subir comprobante de pago', uploadUrl, config.brandColor)}
      </div>
      <div style="margin-bottom: 24px;">
        ${ghostButton('Gestionar mi turno', cancelUrl)}
      </div>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Si cerraste esta página, usá el botón de arriba para acceder a tu reserva y adjuntar el comprobante cuando quieras. También podés usar "Gestionar mi turno" si necesitás reprogramar o cancelar.
      </p>
    `

    const html = baseEmailTemplate({
      brandName: config.brandName,
      brandColor: config.brandColor,
      title: 'Reserva confirmada',
      subtitle: 'Falta subir tu comprobante de transferencia.',
      body,
    })

    const { error } = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: data.clientEmail,
      subject: `Completá tu reserva — ${data.serviceName}`,
      html,
    })

    if (error) {
      console.error('Error sending manual transfer pending email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Error sending manual transfer pending email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error sending email' }
  }
}

/**
 * Send confirmation email to client when they book
 */
export async function sendClientConfirmation(
  data: AppointmentEmailData & {
    startDateTime: Date
    endDateTime: Date
  },
  businessId: string
) {
  if (!data.clientEmail) {
    return { success: false, error: 'No client email' }
  }

  try {
    const config = await getBusinessEmailConfig(businessId)
    const googleCalendarUrl = generateGoogleCalendarLink(data)
    const appUrl = getAppUrl()
    const cancelUrl = clientManageUrl(appUrl, data)

    const rows =
      infoRow('Servicio', data.serviceName) +
      infoRow('Fecha', data.date) +
      infoRow('Hora', data.time) +
      infoRow('Precio', `$${data.servicePrice}`)

    const body = `
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hola ${escapeHtml(data.clientName)}, tu reserva fue confirmada. Aqui tienes los detalles:
      </p>
      ${infoCard(rows, config.brandColor)}
      <div style="margin-bottom: 12px;">
        ${primaryButton('Agregar al calendario', googleCalendarUrl, config.brandColor)}
      </div>
      <div style="margin-bottom: 28px;">
        ${ghostButton('Gestionar mi turno', cancelUrl)}
      </div>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Guarda el link de "Gestionar mi turno" si necesitas reprogramar o cancelar.
      </p>
    `

    const html = baseEmailTemplate({
      brandName: config.brandName,
      brandColor: config.brandColor,
      title: 'Reserva confirmada',
      subtitle: `Tu turno en ${config.brandName} esta agendado.`,
      body,
    })

    const { error } = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: data.clientEmail,
      subject: `Reserva confirmada — ${data.serviceName}`,
      html,
    })

    if (error) {
      console.error('Error sending client confirmation:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Error sending client confirmation:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error sending client confirmation' }
  }
}

/**
 * Send reminder email to client 24hs before appointment
 */
export async function sendAppointmentReminder(
  data: AppointmentEmailData & {
    startDateTime: Date
    endDateTime: Date
  },
  businessId: string
) {
  if (!data.clientEmail) {
    return { success: false, error: 'No client email' }
  }

  try {
    const config = await getBusinessEmailConfig(businessId)
    const appUrl = getAppUrl()
    const cancelUrl = clientManageUrl(appUrl, data)

    const rows =
      infoRow('Servicio', data.serviceName) +
      infoRow('Fecha', data.date) +
      infoRow('Hora', data.time)

    const body = `
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hola ${escapeHtml(data.clientName)}, te recordamos que manana tienes un turno agendado con nosotros.
      </p>
      ${infoCard(rows, config.brandColor)}
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151; text-align: center;">
        Te esperamos.
      </p>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Si necesitas cambiar o cancelar,
        <a href="${cancelUrl}" style="color: ${config.brandColor}; text-decoration: none; font-weight: 600;">gestionalo aqui</a>.
      </p>
    `

    const html = baseEmailTemplate({
      brandName: config.brandName,
      brandColor: config.brandColor,
      title: 'Recordatorio de turno',
      subtitle: 'Tu turno es manana.',
      body,
    })

    const { error } = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: data.clientEmail,
      subject: `Recordatorio — Tu turno es manana`,
      html,
    })

    if (error) {
      console.error('Error sending reminder email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Error sending appointment reminder:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error sending appointment reminder' }
  }
}


/**
 * Send the client a fresh manage link (used by "resend my link").
 * Always goes to the client_email registered on the appointment.
 */
export async function sendManageLinkEmail(
  data: ManageLinkEmailData
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getBusinessEmailConfig(data.businessId)
    const manageUrl = buildManageUrl(getAppUrl(), data.manageToken)

    const rows =
      infoRow('Servicio', data.serviceName ?? 'Turno') +
      infoRow('Fecha', formatDate(data.startTime)) +
      infoRow('Hora', `${formatTime(data.startTime)}hs`)

    const body = `
      <p style="margin: 0 0 24px; font-size: 15px; color: #374151; line-height: 1.6;">
        Hola ${escapeHtml(data.clientName)}, pediste el link para gestionar tu turno.
      </p>
      ${infoCard(rows, config.brandColor)}
      <div style="margin-bottom: 24px;">
        ${primaryButton('Gestionar mi turno', manageUrl, config.brandColor)}
      </div>
      <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.6;">
        Si no lo pediste vos, podés ignorar este mail.
      </p>
    `

    const { error } = await getResendClient().emails.send({
      from: `${config.emailFromName} <${config.emailFrom}>`,
      to: data.clientEmail,
      subject: `Tu link para gestionar el turno — ${data.serviceName ?? config.brandName}`,
      html: baseEmailTemplate({
        brandName: config.brandName,
        brandColor: config.brandColor,
        title: 'Gestioná tu turno',
        body,
      }),
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Error sending manage link email' }
  }
}
