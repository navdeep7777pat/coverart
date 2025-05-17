
'use server';

/**
 * @fileOverview Generates cover art for a song given the song title, artist name, and an optional theme hint.
 *
 * - generateCoverArt - A function that handles the cover art generation process.
 * - GenerateCoverArtInput - The input type for the generateCoverArt function.
 * - GenerateCoverArtOutput - The return type for the generateCoverArt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCoverArtInputSchema = z.object({
  songTitle: z.string().describe('The title of the song.'),
  artistName: z.string().describe('The name of the artist.'),
  themeHint: z.string().optional().describe('An optional hint for the background theme or style of the cover art.'),
});
export type GenerateCoverArtInput = z.infer<typeof GenerateCoverArtInputSchema>;

const GenerateCoverArtOutputSchema = z.object({
  coverArtDataUri: z
    .string()
    .optional() // Marking as optional as per previous fix attempt, will re-evaluate if this is correct
    .describe(
      'The generated cover art as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateCoverArtOutput = z.infer<typeof GenerateCoverArtOutputSchema>;

export async function generateCoverArt(input: GenerateCoverArtInput): Promise<GenerateCoverArtOutput> {
  return generateCoverArtFlow(input);
}

// This prompt object is defined but not directly used by the generateCoverArtFlow below,
// which uses ai.generate directly. It's kept here for potential future use or reference.
// Note: The prompt string in this object needs to be updated if it's ever used, to include the themeHint.
const prompt = ai.definePrompt({
  name: 'generateCoverArtPrompt',
  input: {schema: GenerateCoverArtInputSchema},
  output: {schema: GenerateCoverArtOutputSchema},
  prompt: `Generate cover art for the song "{{{songTitle}}}" by {{{artistName}}}. The cover art should visually represent the song's theme. {{#if themeHint}}The background theme should be inspired by: "{{{themeHint}}}".{{/if}} Please ensure the song title, "{{{songTitle}}}", is prominently displayed on the cover art itself, rendered in a large and artistically appropriate font.`,
});

const generateCoverArtFlow = ai.defineFlow(
  {
    name: 'generateCoverArtFlow',
    inputSchema: GenerateCoverArtInputSchema,
    outputSchema: GenerateCoverArtOutputSchema,
  },
  async (input: GenerateCoverArtInput) => {
    let promptText = `Generate cover art for the song "${input.songTitle}" by ${input.artistName}. The cover art should visually represent the song's theme.`;
    if (input.themeHint && input.themeHint.trim() !== "") {
      promptText += ` The background theme or style should be inspired by: "${input.themeHint}".`;
    }
    promptText += ` Please ensure the song title, "${input.songTitle}", is prominently displayed on the cover art itself, rendered in a large and artistically appropriate font. The image should be square (1:1 aspect ratio).`;

    const response = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: promptText,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const media = response.media;

    if (!media || !media.url) {
      console.error(
        'Image generation failed or did not return a media URL.',
        'Input:', input,
        'Prompt Text:', promptText,
        'Response:', JSON.stringify(response, null, 2)
      );
      // Consider the case where the model might still provide text output even if image fails
      const textOutput = response.text;
      let errorMessage = 'Failed to generate cover art image. The model did not return a valid image or media URL.';
      if (textOutput) {
        errorMessage += ` Model text response: ${textOutput}`;
      }
       if (response.finishReason && response.finishReason !== 'STOP') {
        errorMessage += ` Generation finished due to: ${response.finishReason}.`;
        if (response.finishReason === 'SAFETY' || response.finishReason === 'BLOCKED') {
          errorMessage += ' This might be due to safety filters. Try a different prompt.';
        }
      }
      throw new Error(errorMessage);
    }

    return {
      coverArtDataUri: media.url,
    };
  }
);
