import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Brand settings - could be moved to env or config later
const BRAND_NAME = 'Siv Nails'
const fromEmail = process.env.RESEND_FROM_MAIL || 'reservas@example.com'
const adminEmail = process.env.ADMIN_MAIL

interface AppointmentEmailData {
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
}

// Generate Google Calendar Link Helper
function generateGoogleCalendarLink(data: AppointmentEmailData): string {
  if (!data.startDateTime || !data.endDateTime) return ''

  const formatCalendarDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' +
    encodeURIComponent(data.serviceName + ' - ' + data.clientName) +
    '&dates=' + formatCalendarDate(data.startDateTime) + '/' + formatCalendarDate(data.endDateTime) +
    '&details=' + encodeURIComponent('Cliente: ' + data.clientName + (data.clientPhone ? '\nTel: ' + data.clientPhone : ''))
}

/**
 * Send notification to admin when a new appointment is created
 */
export async function sendNewAppointmentNotification(data: AppointmentEmailData, targetEmail?: string) {
  const emailToUse = targetEmail || adminEmail

  if (!emailToUse) {
    console.warn('ADMIN_MAIL not configured, skipping email notification')
    return { success: false, error: 'Admin email not configured' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appointments.devora.lat'
  const googleCalendarUrl = generateGoogleCalendarLink(data)

  // Create Calendar Button HTML
  let calendarButtonHtml = ''
  if (data.startDateTime && data.endDateTime) {
    calendarButtonHtml = `
            <div style="margin-top: 24px; text-align: center;">
              <a href="${googleCalendarUrl}" 
                 target="_blank"
                 style="display: inline-block; padding: 12px 24px; background: #db2777; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-family: -apple-system, sans-serif; font-weight: bold;">
                📅 Agregar a Google Calendar
              </a>
            </div>
    `
  }

  // Create Cancel Button HTML
  const cancelUrl = `${appUrl}/cancel/${data.id}`
  const cancelButtonHtml = `
            <div style="margin-top: 16px; text-align: center;">
              <a href="${cancelUrl}" 
                 target="_blank"
                 style="display: inline-block; padding: 10px 20px; background: #fff; color: #ef4444; text-decoration: none; border: 1px solid #ef4444; border-radius: 8px; font-size: 14px; font-family: -apple-system, sans-serif;">
                Cancelar Turno
              </a>
            </div>
  `

  try {
    const { error } = await resend.emails.send({
      from: `${BRAND_NAME} <${fromEmail}>`,
      to: emailToUse,
      subject: `Nueva Reserva · ${data.serviceName} - ${data.clientName}`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; background: #faf9f7; padding: 0;">
          <div style="padding: 32px 20px; text-align: center; border-bottom: 3px solid #db2777;">
            <div style="text-transform: uppercase; letter-spacing: 2px; font-size: 12px; color: #db2777; margin-bottom: 8px; font-weight: bold;">Confirmación de Reserva</div>
            <h1 style="margin: 0; font-size: 32px; color: #1f2937; letter-spacing: -0.5px;">${BRAND_NAME}</h1>
          </div>

          <div style="padding: 40px 32px; background: white;">
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px; text-align: center;">
              ¡Hola! Se ha registrado una nueva reserva con los siguientes detalles:
            </p>

            <div style="background: #fff1f2; padding: 32px; border-radius: 16px; text-align: center; border: 1px solid #fce7f3;">
              <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #9d174d;">${data.serviceName}</h2>
              <p style="margin: 0 0 24px 0; font-size: 18px; color: #db2777; font-weight: bold;">$${data.servicePrice}</p>
              
              <div style="border-top: 1px solid #fbcfe8; border-bottom: 1px solid #fbcfe8; padding: 20px 0; margin: 20px 0;">
                <p style="margin: 5px 0; font-size: 16px; color: #374151;"><strong>📅 Fecha:</strong> ${data.date}</p>
                <p style="margin: 5px 0; font-size: 16px; color: #374151;"><strong>⏰ Hora:</strong> ${data.time}</p>
              </div>

              <div style="text-align: left; background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
                <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">👤 <strong>Cliente:</strong> ${data.clientName}</p>
                ${data.clientPhone ? `<p style="margin: 5px 0; font-size: 14px; color: #6b7280;">📱 <strong>Teléfono:</strong> <a href="tel:${data.clientPhone}" style="color: #db2777; text-decoration: none;">${data.clientPhone}</a></p>` : ''}
                ${data.clientEmail ? `<p style="margin: 5px 0; font-size: 14px; color: #6b7280;">📧 <strong>Email:</strong> <a href="mailto:${data.clientEmail}" style="color: #db2777; text-decoration: none;">${data.clientEmail}</a></p>` : ''}
              </div>

              ${calendarButtonHtml}
              ${cancelButtonHtml}
            </div>

            <p style="margin-top: 32px; font-size: 14px; line-height: 1.6; color: #9ca3af; text-align: center;">
              Si necesitas gestionar, modificar o cancelar esta reserva, puedes usar los botones de arriba o ponerte en contacto con el cliente.
            </p>
          </div>

          <div style="padding: 32px; text-align: center; background: #faf9f7; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              © ${new Date().getFullYear()} ${BRAND_NAME}. Todos los derechos reservados.<br>
              Sistema de Reservas Automático
            </p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send confirmation email to client when they book
 */
export async function sendClientConfirmation(data: AppointmentEmailData & {
  startDateTime: Date
  endDateTime: Date
}) {
  if (!data.clientEmail) {
    return { success: false, error: 'No client email' }
  }

  const googleCalendarUrl = generateGoogleCalendarLink(data)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appointments.devora.lat'
  const cancelUrl = `${appUrl}/cancel/${data.id}`

  try {
    const { error } = await resend.emails.send({
      from: `${BRAND_NAME} <${fromEmail}>`,
      to: data.clientEmail,
      subject: `Tu Reserva · ${data.serviceName}`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; background: #faf9f7; padding: 0;">
          <div style="padding: 40px 32px 32px; text-align: center; border-bottom: 1px solid #fce7f3;">
            <div style="display: inline-block; width: 40px; height: 40px; background: #db2777; border-radius: 8px; line-height: 40px; color: white; font-weight: bold; font-size: 18px; margin-bottom: 16px;">S</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f1f24; letter-spacing: -0.5px;">Reserva Confirmada</h1>
          </div>
          
          <div style="padding: 32px;">
            <p style="margin: 0 0 28px; font-size: 16px; color: #52525b; line-height: 1.6;">
              Hola ${data.clientName}, tu turno ha sido reservado.
            </p>
            
            <div style="margin-bottom: 28px;">
              <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #71717a;">Servicio</p>
              <p style="margin: 0; font-size: 20px; color: #1f1f24; font-weight: 500;">${data.serviceName}</p>
            </div>
            
            <table style="width: 100%; margin-bottom: 28px; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #71717a;">Fecha</p>
                  <p style="margin: 0; font-size: 16px; color: #1f1f24;">${data.date}</p>
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #71717a;">Hora</p>
                  <p style="margin: 0; font-size: 16px; color: #1f1f24;">${data.time}</p>
                </td>
              </tr>
            </table>

            <div style="margin-bottom: 32px;">
              <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #71717a;">Precio</p>
              <p style="margin: 0; font-size: 16px; color: #1f1f24;">$${data.servicePrice}</p>
            </div>
            
            <div style="margin-bottom: 32px;">
              <a href="${googleCalendarUrl}" 
                 target="_blank"
                 style="display: inline-block; padding: 12px 24px; background: #db2777; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-family: -apple-system, sans-serif;">
                Agregar al Calendario
              </a>
            </div>
            
            <div style="height: 1px; background: #e8e6e3; margin-bottom: 24px;"></div>
            
             <p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.6;">
              ¿Necesitás cancelar? <a href="${cancelUrl}" style="color: #ef4444;">Click acá</a>
            </p>
            
          </div>
          
          <div style="padding: 24px 32px; background: #fdf2f8; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #71717a;">Te esperamos ✨</p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Error sending client confirmation:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending client confirmation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send reminder email to client 24hs before appointment
 */
export async function sendAppointmentReminder(data: AppointmentEmailData & {
  startDateTime: Date
  endDateTime: Date
}) {
  if (!data.clientEmail) {
    return { success: false, error: 'No client email' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://appointments.devora.lat'
  const cancelUrl = `${appUrl}/cancel/${data.id}`

  try {
    const { error } = await resend.emails.send({
      from: `${BRAND_NAME} <${fromEmail}>`,
      to: data.clientEmail,
      subject: `Recordatorio · Tu turno es mañana ✨`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; background: #faf9f7; padding: 0;">
          <div style="padding: 40px 32px 32px; text-align: center; border-bottom: 1px solid #fce7f3;">
            <div style="display: inline-block; width: 40px; height: 40px; background: #db2777; border-radius: 8px; line-height: 40px; color: white; font-weight: bold; font-size: 18px; margin-bottom: 16px;">S</div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #1f1f24; letter-spacing: -0.5px;">¡Tu turno es mañana! 📅</h1>
          </div>
          
          <div style="padding: 32px;">
            <p style="margin: 0 0 28px; font-size: 16px; color: #52525b; line-height: 1.6;">
              Hola ${data.clientName}, te recordamos que mañana tenés turno con nosotros.
            </p>
            
            <div style="background: #fff1f2; padding: 24px; border-radius: 12px; margin-bottom: 28px;">
              <div style="margin-bottom: 16px;">
                <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #9d174d;">Servicio</p>
                <p style="margin: 0; font-size: 20px; color: #1f1f24; font-weight: 500;">${data.serviceName}</p>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding-right: 8px;">
                    <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #9d174d;">📅 Fecha</p>
                    <p style="margin: 0; font-size: 16px; color: #1f1f24;">${data.date}</p>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding-left: 8px;">
                    <p style="margin: 0 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #9d174d;">⏰ Hora</p>
                    <p style="margin: 0; font-size: 16px; color: #1f1f24;">${data.time}</p>
                  </td>
                </tr>
              </table>
            </div>
            
            <p style="margin: 0 0 24px; font-size: 15px; color: #52525b; text-align: center;">
              Te esperamos ✨
            </p>
            
            <div style="height: 1px; background: #e8e6e3; margin-bottom: 24px;"></div>
            
            <p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.6;">
              ¿Necesitás cancelar? <a href="${cancelUrl}" style="color: #ef4444;">Click acá</a>
            </p>
          </div>
          
          <div style="padding: 24px 32px; background: #fdf2f8; text-align: center;">
            <p style="margin: 0; font-size: 13px; color: #71717a;">¡Nos vemos mañana! 💅</p>
          </div>
        </div>
      `
    })

    if (error) {
      console.error('Error sending reminder email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error sending appointment reminder:', error)
    return { success: false, error: error.message }
  }
}
