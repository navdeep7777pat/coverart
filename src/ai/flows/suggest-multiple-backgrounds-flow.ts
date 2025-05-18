
'use server';
/**
 * @fileOverview Generates multiple concise background prompt suggestions for song cover art.
 *
 * - suggestMultipleBackgrounds - A function that generates a few background prompt suggestions.
 * - SuggestMultipleBackgroundsInput - The input type for the suggestMultipleBackgrounds function.
 * - SuggestMultipleBackgroundsOutput - The return type for the suggestMultipleBackgrounds function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMultipleBackgroundsInputSchema = z.object({
  songTitle: z.string().describe('The title of the song.'),
  artistName: z.string().describe('The name of the artist.'),
});
export type SuggestMultipleBackgroundsInput = z.infer<typeof SuggestMultipleBackgroundsInputSchema>;

const SuggestMultipleBackgroundsOutputSchema = z.object({
  backgroundPrompts: z.array(z.string()).describe('An array of 3 distinct, concise background prompt suggestions, each under 15 words. They should focus on realistic objects and environments embodying old, vintage, natural, or old-school styles, and feel human-captured. Explicitly avoid people or human body parts.'),
});
export type SuggestMultipleBackgroundsOutput = z.infer<typeof SuggestMultipleBackgroundsOutputSchema>;

export async function suggestMultipleBackgrounds(input: SuggestMultipleBackgroundsInput): Promise<SuggestMultipleBackgroundsOutput> {
  return suggestMultipleBackgroundsFlow(input);
}

const multipleBackgroundsPrompt = ai.definePrompt({
  name: 'suggestMultipleBackgroundsPrompt',
  input: {schema: SuggestMultipleBackgroundsInputSchema},
  output: {schema: SuggestMultipleBackgroundsOutputSchema},
  prompt: `You are a creative assistant specializing in generating diverse, concise, and evocative background image prompts for song cover art, with a strong preference for **vintage, natural, and old-school aesthetics.**
You will receive a song title and an artist name.
Based on these, generate 3 distinct and varied background prompt suggestions. Each suggestion should be a complete, self-contained prompt.

Each prompt MUST:
1. Be under 15 words.
2. Describe a **highly realistic scene, object, or concept that feels natural and human-captured.**
3. Embody an **old, vintage, natural, or old-school style.** Avoid modern, sleek, or digital-looking suggestions.
4. Focus ONLY on objects, environments, textures, or abstract patterns.
5. Explicitly AVOID any depiction of people, human figures, or any human body parts.
6. Be suitable for direct use in an AI image generation model to create a **photorealistic, human-captured style background.**
7. Be thematically relevant to the song title and artist name.

Song Title: {{songTitle}}
Artist Name: {{artistName}}

Respond ONLY with the JSON object matching the output schema, like {"backgroundPrompts": ["prompt1", "prompt2", "prompt3"]}, ensuring each prompt reflects these stylistic preferences.`,
});

const suggestMultipleBackgroundsFlow = ai.defineFlow(
  {
    name: 'suggestMultipleBackgroundsFlow',
    inputSchema: SuggestMultipleBackgroundsInputSchema,
    outputSchema: SuggestMultipleBackgroundsOutputSchema,
  },
  async (input) => {
    const {output} = await multipleBackgroundsPrompt(input);
    if (!output?.backgroundPrompts || output.backgroundPrompts.length === 0) {
      throw new Error('AI did not return any background prompt suggestions.');
    }
    return { backgroundPrompts: output.backgroundPrompts };
  }
);
