import { z } from 'zod';

// ── Journal Entry ────────────────────────────────────────
export const journalEntrySchema = z
  .object({
    type: z.enum(['daily', 'weekly', 'progress_note', 'meeting_note', 'other']),
    content: z.string().min(1, 'Content is required'),
    date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'weekly') {
        return !!data.start_date && !!data.end_date;
      }
      return true;
    },
    {
      message: 'Weekly entries require both start and end dates',
      path: ['start_date'],
    }
  );

export type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

// ── Project Creation ─────────────────────────────────────
export const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(100, 'Project name must be under 100 characters'),
  description: z.string().max(200, 'Description must be under 200 characters').optional(),
  tags: z.array(z.string()).optional(),
  startDate: z.string().optional(),
});

export type CreateProjectFormData = z.infer<typeof createProjectSchema>;

// ── E2EE Passphrase ──────────────────────────────────────
export const enableE2EESchema = z
  .object({
    passphrase: z.string().min(8, 'Passphrase must be at least 8 characters'),
    confirm: z.string().min(1, 'Please confirm your passphrase'),
  })
  .refine((data) => data.passphrase === data.confirm, {
    message: 'Passphrases do not match',
    path: ['confirm'],
  });

export type EnableE2EEFormData = z.infer<typeof enableE2EESchema>;

export const changePassphraseSchema = z.object({
  oldPassphrase: z.string().min(1, 'Enter your current passphrase'),
  newPassphrase: z.string().min(8, 'New passphrase must be at least 8 characters'),
});

export type ChangePassphraseFormData = z.infer<typeof changePassphraseSchema>;
