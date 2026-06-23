import { z } from 'zod';

const GOOGLE_REVIEW_URL_PATTERN =
  /^https?:\/\/(www\.)?(google\.com\/maps|maps\.app\.goo\.gl)\/.+/;

export const signUpSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  businessName: z.string().min(1).max(100),
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  googleReviewUrl: z
    .string()
    .url()
    .regex(GOOGLE_REVIEW_URL_PATTERN, 'Must be a valid Google Maps review link'),
});

export const sendRequestSchema = z.object({
  phoneNumber: z
    .string()
    .regex(
      /^\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
      'Must be a valid US phone number',
    ),
  customerName: z.string().max(50).optional().or(z.literal('')),
  serviceType: z.string().max(50).optional().or(z.literal('')),
});

export const ratingSchema = z.number().int().min(1).max(5);

export const feedbackTextSchema = z.string().max(500);

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SendRequestFormData = z.infer<typeof sendRequestSchema>;
