'use server';

/**
 * @fileOverview Generates cover art for a song given the song title and artist name.
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
});
export type GenerateCoverArtInput = z.infer<typeof GenerateCoverArtInputSchema>;

const GenerateCoverArtOutputSchema = z.object({
  coverArtDataUri: z
    .string()
    .describe(
      'The generated cover art as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // keep the backslashes so that the string is not interpreted as a template literal
    ),
});
export type GenerateCoverArtOutput = z.infer<typeof GenerateCoverArtOutputSchema>;

export async function generateCoverArt(input: GenerateCoverArtInput): Promise<GenerateCoverArtOutput> {
  return generateCoverArtFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCoverArtPrompt',
  input: {schema: GenerateCoverArtInputSchema},
  output: {schema: GenerateCoverArtOutputSchema},
  prompt: `Generate cover art for the song "{{{songTitle}}}" by {{{artistName}}}. The cover art should visually represent the song's theme.`, // DO NOT include a Handlebars helper function here. This is invalid.
});

const generateCoverArtFlow = ai.defineFlow(
  {
    name: 'generateCoverArtFlow',
    inputSchema: GenerateCoverArtInputSchema,
    outputSchema: GenerateCoverArtOutputSchema,
  },
  async input => {
    const {media} = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp',
      prompt: `Generate cover art for the song "${input.songTitle}" by ${input.artistName}. The cover art should visually represent the song's theme.`, // Valid way to access input values.
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    return {
      coverArtDataUri: media.url,
    };
  }
);
