
'use server';

/**
 * @fileOverview Generates cover art for a song given the song title, artist name, and an optional theme hint.
 *
 * - generateCoverArt - A function that handles the cover art generation process.
 * - GenerateCoverArtInput - The input type for the generateCoverArt function.
 * - GenerateCoverArtOutput - The return type for the generateCoverArtOutput function.
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
    .optional() 
    .describe(
      'The generated cover art as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
});
export type GenerateCoverArtOutput = z.infer<typeof GenerateCoverArtOutputSchema>;

export async function generateCoverArt(input: GenerateCoverArtInput): Promise<GenerateCoverArtOutput> {
  return generateCoverArtFlow(input);
}

// This prompt definition is currently not used by the generateCoverArtFlow below,
// as the flow constructs its own prompt string for ai.generate.
// It's kept here for potential future use or if the flow is refactored.
const _unusedPromptDefinition = ai.definePrompt({
  name: 'generateCoverArtTextPrompt', // Renamed to avoid confusion
  input: {schema: GenerateCoverArtInputSchema},
  output: {schema: GenerateCoverArtOutputSchema}, // This output schema might not be suitable if this prompt were used for direct image generation.
  prompt: `Generate cover art for the song "{{{songTitle}}}" by {{{artistName}}}. The cover art should visually represent the song's theme. The background should be in a realistic style. {{#if themeHint}}The background theme should be inspired by: "{{{themeHint}}}".{{/if}} Please ensure the song title, "{{{songTitle}}}", is prominently displayed on the cover art itself, rendered in a large and artistically appropriate font. Prioritize old, vintage, natural, and old-school styles. Backgrounds should be natural and realistic, as if created or captured by a human.`,
});

const generateCoverArtFlow = ai.defineFlow(
  {
    name: 'generateCoverArtFlow',
    inputSchema: GenerateCoverArtInputSchema,
    outputSchema: GenerateCoverArtOutputSchema,
  },
  async (input: GenerateCoverArtInput) => {
    let promptText = `Generate a truly realistic image for the cover art of the song "${input.songTitle}" by ${input.artistName}. `;
    promptText += `The artwork should visually represent the song's theme. `;
    promptText += `Prioritize old, vintage, natural, and old-school styles over modern, sleek, or overly digital aesthetics. `;
    promptText += `The overall style must be highly realistic, resembling a photograph. `;
    promptText += `Backgrounds, in particular, must be natural and realistic, evoking a sense of being created or captured by a human, not artificially generated. `;

    if (input.themeHint && input.themeHint.trim() !== "") {
      promptText += `The background theme or style should be inspired by: "${input.themeHint}". Integrate this theme in a way that maintains the natural, realistic, and vintage/old-school preference. `;
    }

    promptText += `Please ensure the song title, "${input.songTitle}", is prominently displayed on the cover art itself, rendered in a large and artistically appropriate font that complements the overall vintage/natural style. The image should be square (1:1 aspect ratio).`;
    
    let responseFromAIGenerate;
    try {
      responseFromAIGenerate = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
        prompt: promptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
    } catch (error: any) {
      console.error('Critical error during ai.generate call:', {
        errorMessage: error.message,
        inputData: input,
        constructedPrompt: promptText,
      });
      
      let userFriendlyMessage = "The AI image generator encountered a critical problem.";
      if (error.message) {
        if (error.message.includes("API key not valid") || error.message.includes("API_KEY_INVALID")) {
          userFriendlyMessage = "The GOOGLE_API_KEY seems to be invalid. Please verify it in your .env file and ensure the Genkit server is restarted if changed.";
        } else if (error.message.toLowerCase().includes("quota")) {
          userFriendlyMessage = "It seems you've exceeded your API quota with the AI provider. Please check your account status.";
        } else if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
            userFriendlyMessage = "The AI service could not be reached. Check network connectivity and ensure the AI service is operational.";
        } else if (error.message.includes("Deadline exceeded") || error.message.includes("timeout")) {
            userFriendlyMessage = "The request to the AI service timed out. Please try again later.";
        } else {
            userFriendlyMessage = `An unexpected error occurred with the AI service. Details: ${error.message}`;
        }
      }
      throw new Error(userFriendlyMessage);
    }
    
    const media = responseFromAIGenerate?.media;

    if (!media || !media.url) {
      console.error(
        'Image generation call succeeded but no valid media URL was returned.',
        'Input:', input,
        'Prompt Text:', promptText,
        'Full Response (for debugging):', JSON.stringify(responseFromAIGenerate, null, 2)
      );
      
      const textOutput = responseFromAIGenerate?.text;
      let errorMessage = 'Failed to generate cover art: The model did not return a valid image.';
      
      if (textOutput) {
        errorMessage += ` Model text response: ${textOutput}`;
      }
      
      if (responseFromAIGenerate?.finishReason && responseFromAIGenerate.finishReason !== 'STOP') {
        errorMessage += ` Generation finished due to: ${responseFromAIGenerate.finishReason}.`;
        if (responseFromAIGenerate.finishReason === 'SAFETY' || responseFromAIGenerate.finishReason === 'BLOCKED') {
          errorMessage += ' This might be due to content safety filters. Try a different prompt or theme.';
        }
      }
      throw new Error(errorMessage);
    }

    return {
      coverArtDataUri: media.url,
    };
  }
);
