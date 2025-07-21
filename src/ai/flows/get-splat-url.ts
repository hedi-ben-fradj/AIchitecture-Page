'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { storage } from '@/lib/firebase-admin';

const GetSplatUrlInputSchema = z.object({
  filePath: z.string().describe('The full HTTPS URL to the .splat file in Firebase Storage.'),
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
      
      // Extract the object path from the full URL
      // e.g. from https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile.splat?alt=media&token=...
      // to path/to/file.splat
      const url = new URL(filePath);
      const pathWithToken = url.pathname.split('/o/')[1];
      const decodedPath = decodeURIComponent(pathWithToken.split('?')[0]);

      const file = bucket.file(decodedPath);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-17-2026', 
      });

      return signedUrl;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Could not generate signed URL for the splat file.');
    }
  }
);
