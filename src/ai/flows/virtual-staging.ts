// Virtual staging feature using Genkit to visualize properties with different furniture styles.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VirtualStagingInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a property interior as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  furnitureStyle: z.string().describe('The desired furniture style for staging (e.g., modern, rustic, minimalist).'),
});
export type VirtualStagingInput = z.infer<typeof VirtualStagingInputSchema>;

const VirtualStagingOutputSchema = z.object({
  stagedPhotoDataUri: z
    .string()
    .describe(
      'The photo of the property interior, virtually staged with the specified furniture style, as a data URI.'
    ),
});
export type VirtualStagingOutput = z.infer<typeof VirtualStagingOutputSchema>;

export async function virtualStaging(input: VirtualStagingInput): Promise<VirtualStagingOutput> {
  return virtualStagingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'virtualStagingPrompt',
  input: {schema: VirtualStagingInputSchema},
  output: {schema: VirtualStagingOutputSchema},
  prompt: `You are an AI virtual staging expert. Given a photo of a property interior and a desired furniture style, you will generate a new image of the interior, virtually staged with the specified furniture style.

  Original Photo: {{media url=photoDataUri}}
  Furniture Style: {{{furnitureStyle}}}

  Generate an image that maintains the original layout and architectural features, but replaces the existing furniture with furniture matching the specified style.  Preserve the photo's original resolution and perspective as much as possible.
  Return the staged photo as a data URI.
  `,
});

const virtualStagingFlow = ai.defineFlow(
  {
    name: 'virtualStagingFlow',
    inputSchema: VirtualStagingInputSchema,
    outputSchema: VirtualStagingOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        {media: {url: input.photoDataUri}},
        {text: `Virtually stage this photo in the style of ${input.furnitureStyle}`},
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {stagedPhotoDataUri: media!.url};
  }
);
