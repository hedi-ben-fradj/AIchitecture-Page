'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { storage } from '@/lib/firebase-admin';

const GetSplatUrlInputSchema = z.object({
  filePath: z.string().describe('The path to the .splat file in Firebase Storage.'),
});

export async function getSplatUrl(input: z.infer<typeof GetSplatUrlInputSchema>): Promise<string> {
  return getSplatUrlFlow(input);
}

const getSplatUrlFlow = ai.defineFlow(
  {
    name: 'getSplatUrlFlow',
    inputSchema: GetSplatUrlInputSchema,
    outputSchema: z.string(),
  },
  async ({ filePath }) => {
    try {
      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-17-2026', 
      });

      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Could not generate signed URL for the splat file.');
    }
  }
);
