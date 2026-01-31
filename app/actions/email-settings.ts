'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentBusiness } from '@/app/actions/auth'
import { ServerActionResponse } from '@/types/database.types'

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
        email_brand_color: emailBrandColor || '#db2777',
        updated_at: new Date().toISOString()
      })
      .eq('id', businessResult.data.id)

    if (error) throw error

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

    const { error } = await resend.emails.send({
      from: `${emailFromName || 'Test'} <${emailFrom}>`,
      to: adminNotificationEmail,
      subject: 'Test de Configuración de Email',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: ${settingsResult.data.emailBrandColor || '#db2777'};">Configuración Exitosa ✓</h2>
          <p>Tu configuración de email está funcionando correctamente.</p>
          <p><strong>Email de envío:</strong> ${emailFrom}</p>
          <p><strong>Email de notificaciones:</strong> ${adminNotificationEmail}</p>
        </div>
      `
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
