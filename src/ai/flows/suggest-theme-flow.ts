
'use server';
/**
 * @fileOverview Generates a theme suggestion for song cover art.
 *
 * - suggestTheme - A function that generates a theme suggestion based on song title and artist.
 * - GenerateThemeSuggestionInput - The input type for the suggestTheme function.
 * - GenerateThemeSuggestionOutput - The return type for the suggestTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateThemeSuggestionInputSchema = z.object({
  songTitle: z.string().describe('The title of the song.'),
  artistName: z.string().describe('The name of the artist (acting as a subtitle for theme generation).'),
});
export type GenerateThemeSuggestionInput = z.infer<typeof GenerateThemeSuggestionInputSchema>;

const GenerateThemeSuggestionOutputSchema = z.object({
  themeSuggestion: z.string().describe('A clear, simple, short (under 30 words), and easily editable theme suggestion for AI-based realistic image generation, focusing on mood, background, visual style, and thematic elements. It should only suggest objects and avoid any people or human figures. The background must be realistic.'),
});
export type GenerateThemeSuggestionOutput = z.infer<typeof GenerateThemeSuggestionOutputSchema>;

export async function suggestTheme(input: GenerateThemeSuggestionInput): Promise<GenerateThemeSuggestionOutput> {
  return suggestThemeFlow(input);
}

const themePrompt = ai.definePrompt({
  name: 'suggestThemePrompt',
  input: {schema: GenerateThemeSuggestionInputSchema},
  output: {schema: GenerateThemeSuggestionOutputSchema},
  prompt: `You are a creative cover art assistant for Spotify.
You will receive a cover art title and an Artist Name (as subtitle).
Based on this, generate a detailed visual concept for the cover art that can guide AI-based realistic image generation.
Focus on mood, background setting, visual style, and relevant thematic elements.

Make sure the suggested theme matches the tone of the title.
Keep the output under 30 words and make it editable by the user.
The background should have only realistic images.
No person should be created. Only objects will be used to create images.
Explicitly avoid depicting any people or human figures. Focus on objects and environments.

Title: {{songTitle}}
Artist Name (Subtitle): {{artistName}}

Respond only with the theme suggestion in plain text.`,
});

const suggestThemeFlow = ai.defineFlow(
  {
    name: 'suggestThemeFlow',
    inputSchema: GenerateThemeSuggestionInputSchema,
    outputSchema: GenerateThemeSuggestionOutputSchema,
  },
  async (input) => {
    const {output} = await themePrompt(input);
    if (!output?.themeSuggestion) {
      throw new Error('AI did not return a theme suggestion.');
    }
    return { themeSuggestion: output.themeSuggestion };
  }
);
