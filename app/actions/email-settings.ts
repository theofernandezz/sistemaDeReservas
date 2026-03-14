'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { getCurrentBusiness } from '@/app/actions/auth'
import { baseEmailTemplate } from '@/lib/email'
import { ServerActionResponse } from '@/types/database.types'

const DEFAULT_BRAND_COLOR = '#6366f1'

/**
 * Get email configuration for the current business
 */
export async function getBusinessEmailSettings(): Promise<ServerActionResponse<{
  emailFrom: string | null
  emailFromName: string | null
  adminNotificationEmail: string | null
  emailBrandColor: string | null
}>> {
  try {
    const businessResult = await getCurrentBusiness()
    
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('businesses')
      .select('email_from, email_from_name, admin_notification_email, email_brand_color')
      .eq('id', businessResult.data.id)
      .single()

    if (error) throw error

    return {
      success: true,
      data: {
        emailFrom: data?.email_from || null,
        emailFromName: data?.email_from_name || null,
        adminNotificationEmail: data?.admin_notification_email || null,
        emailBrandColor: data?.email_brand_color || null,
      }
    }
  } catch (error: unknown) {
    console.error('Error getting email settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error al obtener configuración de email' }
  }
}

/**
 * Update email configuration for the current business
 */
export async function updateBusinessEmailSettings(
  emailFrom: string,
  emailFromName: string,
  adminNotificationEmail: string,
  emailBrandColor?: string
): Promise<ServerActionResponse<void>> {
  try {
    const businessResult = await getCurrentBusiness()
    
    if (!businessResult.success || !businessResult.data) {
      return { success: false, error: 'No se encontró el negocio' }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailFrom)) {
      return { success: false, error: 'El email de envío no es válido' }
    }
    if (!emailRegex.test(adminNotificationEmail)) {
      return { success: false, error: 'El email de notificaciones no es válido' }
    }

    // Validate brand color (hex format)
    if (emailBrandColor) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/
      if (!colorRegex.test(emailBrandColor)) {
        return { success: false, error: 'El color debe ser en formato hex (ej: #db2777)' }
      }
    }

    const supabase = await createClient()
    
    const { error } = await supabase
      .from('businesses')
      .update({
        email_from: emailFrom,
        email_from_name: emailFromName,
        admin_notification_email: adminNotificationEmail,
        email_brand_color: emailBrandColor || DEFAULT_BRAND_COLOR,
        updated_at: new Date().toISOString()
      })
      .eq('id', businessResult.data.id)

    if (error) throw error

    revalidatePath('/dashboard/settings')
    return { success: true }
  } catch (error: unknown) {
    console.error('Error updating email settings:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar configuración de email' }
  }
}

/**
 * Test email configuration by sending a test email
 */
export async function testBusinessEmailConfiguration(): Promise<ServerActionResponse<void>> {
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const settingsResult = await getBusinessEmailSettings()
    
    if (!settingsResult.success || !settingsResult.data) {
      return { success: false, error: 'No se pudo obtener la configuración de email' }
    }

    const { emailFrom, emailFromName, adminNotificationEmail } = settingsResult.data

    if (!emailFrom || !adminNotificationEmail) {
      return { success: false, error: 'Configuración de email incompleta' }
    }

    const brandColor = settingsResult.data.emailBrandColor || DEFAULT_BRAND_COLOR
    const brandName = emailFromName || 'Sistema de Reservas'

    const testBody = `
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
        Tu configuracion de email esta funcionando correctamente.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; border-left: 3px solid ${brandColor}; margin-bottom: 24px;">
        <tr><td style="padding: 20px 24px;">
          <p style="margin: 0 0 10px; font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Email de envio:</strong> ${emailFrom}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;"><strong style="color: #374151;">Email de notificaciones:</strong> ${adminNotificationEmail}</p>
        </td></tr>
      </table>
      <p style="margin: 0; font-size: 13px; color: #9ca3af;">
        Este es un correo de prueba generado desde el panel de configuracion.
      </p>
    `

    const { error } = await resend.emails.send({
      from: `${brandName} <${emailFrom}>`,
      to: adminNotificationEmail,
      subject: 'Prueba de configuracion de email',
      html: baseEmailTemplate({
        brandName,
        brandColor,
        title: 'Configuracion exitosa',
        subtitle: 'Tu sistema de emails esta listo para usar.',
        body: testBody,
      }),
    })

    if (error) {
      return { success: false, error: `Error al enviar email de prueba: ${error.message}` }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('Error testing email configuration:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error al probar configuración de email' }
  }
}
