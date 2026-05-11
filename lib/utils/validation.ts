/**
 * Validation utilities for forms
 * Includes email and phone validation (Argentine format)
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates email format
 * @param email - Email to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'El email es requerido' }
  }

  // RFC 5322 compliant email regex (simplified for practical use)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Ingresá un email válido (ej: nombre@ejemplo.com)' }
  }

  return { isValid: true }
}

/**
 * Validates Argentine phone number format
 * Accepts: +54 9 11 1234-5678, 011 1234-5678, 11 1234-5678
 * @param phone - Phone number to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateArgentinePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'El teléfono es requerido' }
  }

  const trimmed = phone.trim()

  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    return validateInternationalPhone(trimmed)
  }

  const digitsOnly = phone.replace(/\D/g, '')

  // Argentina: 10 digits local, 11 with leading 0, 12-13 with country code 54
  const isLocal = digitsOnly.length === 10
  const isLocalWithZero = digitsOnly.length === 11 && digitsOnly.startsWith('0')
  const isInternational = digitsOnly.length >= 12 && digitsOnly.length <= 13 &&
    (digitsOnly.startsWith('54') || digitsOnly.startsWith('549'))

  if (!isLocal && !isLocalWithZero && !isInternational) {
    return { isValid: false, error: 'Ingresá un teléfono válido (ej: 11 1234-5678 o +54 11 1234-5678)' }
  }

  return { isValid: true }
}

/**
 * Validates international phone number format (optional field)
 * Accepts: +54 11 1234-5678, +1 202 555 0101, 5491112345678
 * @param phone - Phone number to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateInternationalPhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true }
  }

  const cleaned = phone.replace(/[\s(),-]/g, '')
  const internationalRegex = /^\+?[1-9]\d{6,14}$/

  if (!internationalRegex.test(cleaned)) {
    return { isValid: false, error: 'Ingresá un teléfono válido (ej: +54 11 1234-5678)' }
  }

  return { isValid: true }
}

/**
 * Formats Argentine phone number for display
 * Formats: +54 9 11 1234-5678 → standard format with dashes
 * @param phone - Raw phone input
 * @returns Formatted phone number
 */
export function formatArgentinePhone(phone: string): string {
  if (!phone) return ''

  const trimmed = phone.trim()
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    return trimmed
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  if (digits.length === 0) return ''
  
  // Format based on length and prefix
  if (digits.startsWith('54') || digits.startsWith('549')) {
    // International format: +54 9 XX XXXX-XXXX
    const hasNine = digits.startsWith('549')
    const countryCode = '54'
    const nine = hasNine ? '9' : ''
    const rest = hasNine ? digits.substring(3) : digits.substring(2)
    
    if (rest.length <= 2) {
      return `+${countryCode} ${nine} ${rest}`.trim()
    } else if (rest.length <= 6) {
      return `+${countryCode} ${nine} ${rest.substring(0, 2)} ${rest.substring(2)}`.trim()
    } else {
      const areaCode = rest.substring(0, 2)
      const firstPart = rest.substring(2, 6)
      const secondPart = rest.substring(6, 10)
      return `+${countryCode} ${nine} ${areaCode} ${firstPart}-${secondPart}`.trim()
    }
  } else if (digits.startsWith('0')) {
    // National format with 0: 0XX XXXX-XXXX
    const rest = digits.substring(1)
    
    if (rest.length <= 2) {
      return `0${rest}`
    } else if (rest.length <= 6) {
      return `0${rest.substring(0, 2)} ${rest.substring(2)}`
    } else {
      const areaCode = rest.substring(0, 2)
      const firstPart = rest.substring(2, 6)
      const secondPart = rest.substring(6, 10)
      return `0${areaCode} ${firstPart}-${secondPart}`
    }
  } else {
    // Local format: XX XXXX-XXXX
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 6) {
      return `${digits.substring(0, 2)} ${digits.substring(2)}`
    } else {
      const areaCode = digits.substring(0, 2)
      const firstPart = digits.substring(2, 6)
      const secondPart = digits.substring(6, 10)
      return `${areaCode} ${firstPart}-${secondPart}`
    }
  }
}

/**
 * Validates name field
 * @param name - Name to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'El nombre es requerido' }
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: 'El nombre debe tener al menos 2 caracteres' }
  }
  
  // Check for valid characters (letters, spaces, and common name characters)
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, error: 'El nombre contiene caracteres no válidos' }
  }
  
  return { isValid: true }
}

/**
 * Form validation result for all fields
 */
export interface FormValidationState {
  name: ValidationResult
  email: ValidationResult
  phone: ValidationResult
}

/**
 * Validates all form fields
 * @param name - User name
 * @param email - User email
 * @param phone - User phone
 * @returns Object with validation results for each field
 */
export function validateBookingForm(
  name: string,
  email: string,
  phone: string
): FormValidationState {
  return {
    name: validateName(name),
    email: validateEmail(email),
    phone: validateArgentinePhone(phone)
  }
}

/**
 * Checks if all form validations pass
 * @param validationState - Form validation state
 * @returns true if all fields are valid
 */
export function isFormValid(validationState: FormValidationState): boolean {
  return validationState.name.isValid && 
         validationState.email.isValid && 
         validationState.phone.isValid
}
