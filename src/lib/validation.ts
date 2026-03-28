import { z } from 'zod';

// Phone number validation for Nigerian numbers
const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;

// Email validation
const emailSchema = z.string().email('Invalid email format').optional().nullable();

// Profile validation schema
export const profileSchema = z.object({
  surname: z.string().min(1, 'Surname is required').max(100, 'Surname too long'),
  first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
  other_name: z.string().max(100, 'Other name too long').optional().nullable(),
  preferred_name: z.string().max(100, 'Preferred name too long').optional().nullable(),
  prefix: z.string().max(20, 'Prefix too long').optional().nullable(),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional().nullable(),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
  phone: z.string().regex(phoneRegex, 'Invalid Nigerian phone number').optional().nullable(),
  house_address: z.string().max(500, 'Address too long').optional().nullable(),
  office_address: z.string().max(500, 'Office address too long').optional().nullable(),
  state: z.string().max(50, 'State name too long').optional().nullable(),
  lga: z.string().max(100, 'LGA name too long').optional().nullable(),
  lcda: z.string().max(100, 'LCDA name too long').optional().nullable(),
  occupation: z.string().max(100, 'Occupation too long').optional().nullable(),
  identity_type: z.enum(['BVN', 'NIN']).optional().nullable(),
  identity_number: z.string().length(11, 'Identity number must be 11 digits').regex(/^\d+$/, 'Identity number must contain only digits').optional().nullable(),
  lassra_no: z.string().max(50, 'LASSRA number too long').optional().nullable(),
  passport_photo_url: z.string().url('Invalid URL').max(1000, 'URL too long').optional().nullable(),
  apartment_style: z.enum(['flat', 'bungalow', 'duplex', 'studio', 'mini_flat']).optional().nullable(),
  apartment_type: z.enum(['tenant', 'owner', 'mission', 'gift', 'family']).optional().nullable(),
  rent_amount: z.number().min(0, 'Rent amount cannot be negative').max(100000000, 'Rent amount too large').optional().nullable(),
  rent_agreement_url: z.string().max(1000, 'URL too long').optional().nullable(),
  rent_receipt_url: z.string().max(1000, 'URL too long').optional().nullable(),
  has_mortgage: z.boolean().optional().nullable(),
  num_banks: z.number().int().min(0).max(20).optional().nullable(),
  banks_list: z.array(z.string().max(100)).max(20).optional().nullable(),
  num_cars: z.number().int().min(0).max(100).optional().nullable(),
  num_houses: z.number().int().min(0).max(100).optional().nullable(),
});

// Bank account validation schema
export const bankAccountSchema = z.object({
  bank_name: z.string().min(1, 'Bank name required').max(100, 'Bank name too long'),
  account_number: z.string().length(10, 'Account number must be 10 digits').regex(/^\d+$/, 'Account number must contain only digits'),
  account_type: z.enum(['Savings', 'Current']),
});

// Rejection reason validation
export const rejectionReasonSchema = z.string()
  .min(10, 'Rejection reason must be at least 10 characters')
  .max(1000, 'Rejection reason too long');

// BVN validation
export const bvnSchema = z.string()
  .length(11, 'BVN must be 11 digits')
  .regex(/^\d+$/, 'BVN must contain only digits');

// Admin login validation
export const adminLoginSchema = z.object({
  username: z.string().min(1, 'Username required').max(100, 'Username too long'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
});

// Validation helper function
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return { success: false, error: firstError.message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Safe validation that returns null on failure
export function safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  try {
    return schema.parse(data);
  } catch {
    return null;
  }
}
