
"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { generateCoverArt, type GenerateCoverArtInput } from '@/ai/flows/generate-cover-art';
import { suggestTheme, type GenerateThemeSuggestionInput } from '@/ai/flows/suggest-theme-flow';
import { suggestMultipleBackgrounds, type SuggestMultipleBackgroundsInput } from '@/ai/flows/suggest-multiple-backgrounds-flow';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, Music2, Wand2, Lightbulb, Sparkles } from "lucide-react";

const formSchema = z.object({
  songTitle: z.string().min(1, "Song title is required").max(100, "Song title too long"),
  artistName: z.string().min(1, "Artist name is required").max(100, "Artist name too long"),
  themeHint: z.string().max(500, "Theme prompt too long").optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ArtifyPage() {
  const [coverArtDataUri, setCoverArtDataUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggestingTheme, setIsSuggestingTheme] = useState(false);
  const [isSuggestingMultiple, setIsSuggestingMultiple] = useState(false);
  const [multipleBackgroundSuggestions, setMultipleBackgroundSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      songTitle: "",
      artistName: "",
      themeHint: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setCoverArtDataUri(null); 
    setMultipleBackgroundSuggestions([]); // Clear suggestions on new art generation
    try {
      const inputData: GenerateCoverArtInput = {
        songTitle: data.songTitle,
        artistName: data.artistName,
        themeHint: data.themeHint || undefined,
      };
      const result = await generateCoverArt(inputData);
      
      if (result.coverArtDataUri) {
        setCoverArtDataUri(result.coverArtDataUri);
        toast({
          title: "Art Generated!",
          description: "Your unique cover art is ready.",
        });
      } else {
        throw new Error("Cover art URI was not returned by the AI flow.");
      }
    } catch (error) {
      console.error("Error generating cover art (client-side):", error);
      let description = "Something went wrong. Please try again.";
      if (error instanceof Error) {
        description = error.message || description;
      } else if (typeof error === 'object' && error !== null && 'toString' in error) {
        description = String(error);
      } else if (typeof error === 'string') {
        description = error;
      }
      
      if (description.toLowerCase().includes("failed to fetch")) {
        description += " This might mean the AI service is temporarily unavailable or the Genkit server is not running. Please check your setup and try again.";
      }

      toast({
        title: "Error Generating Art",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestTheme = async () => {
    const { songTitle, artistName } = form.getValues();
    if (!songTitle || !artistName) {
      toast({
        title: "Missing Information",
        description: "Please enter a song title and artist name first.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingTheme(true);
    setMultipleBackgroundSuggestions([]); // Clear other suggestions
    try {
      const inputData: GenerateThemeSuggestionInput = { songTitle, artistName };
      const result = await suggestTheme(inputData);
      if (result.themeSuggestion) {
        form.setValue("themeHint", result.themeSuggestion);
        toast({
          title: "Theme Suggested!",
          description: "A theme prompt has been added below.",
        });
      }
    } catch (error) {
      console.error("Error suggesting theme:", error);
      toast({
        title: "Error Suggesting Theme",
        description: error instanceof Error ? error.message : "Could not fetch theme suggestion.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingTheme(false);
    }
  };

  const handleSuggestMultipleBackgrounds = async () => {
    const { songTitle, artistName } = form.getValues();
    if (!songTitle || !artistName) {
      toast({
        title: "Missing Information",
        description: "Please enter a song title and artist name first.",
        variant: "destructive",
      });
      return;
    }
    setIsSuggestingMultiple(true);
    setMultipleBackgroundSuggestions([]);
    try {
      const inputData: SuggestMultipleBackgroundsInput = { songTitle, artistName };
      const result = await suggestMultipleBackgrounds(inputData);
      if (result.backgroundPrompts && result.backgroundPrompts.length > 0) {
        setMultipleBackgroundSuggestions(result.backgroundPrompts);
        toast({
          title: "Background Ideas Suggested!",
          description: "Choose an idea below or refine your own prompt.",
        });
      } else {
        toast({
          title: "No Suggestions",
          description: "The AI couldn't come up with background ideas this time. Try different inputs!",
        });
      }
    } catch (error) {
      console.error("Error suggesting multiple backgrounds:", error);
      toast({
        title: "Error Suggesting Backgrounds",
        description: error instanceof Error ? error.message : "Could not fetch background suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsSuggestingMultiple(false);
    }
  };

  const handleDownload = () => {
    if (!coverArtDataUri) return;
    const link = document.createElement('a');
    link.href = coverArtDataUri;
    const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_.-]/gi, '_').replace(/_{2,}/g, '_');
    const filename = `${sanitizeFilename(form.getValues("songTitle") || "untitled")}_${sanitizeFilename(form.getValues("artistName") || "unknown")}_cover.jpg`; 
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Download Started",
      description: `Downloading ${filename}`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM10.68 18.43L7.15 14.9C6.76 14.51 6.76 13.88 7.15 13.49C7.54 13.1 8.17 13.1 8.56 13.49L10.68 15.61L15.44 10.85C15.83 10.46 16.46 10.46 16.85 10.85C17.24 11.24 17.24 11.87 16.85 12.26L10.68 18.43Z" fill="currentColor"/>
              <path d="M12 5C11.17 5 10.5 5.67 10.5 6.5C10.5 7.33 11.17 8 12 8C12.83 8 13.5 7.33 13.5 6.5C13.5 5.67 12.83 5 12 5Z" fill="hsl(var(--accent))"/>
              <path d="M16.5 8.5C16.22 8.5 16 8.72 16 9C16 9.28 16.22 9.5 16.5 9.5C16.78 9.5 17 9.28 17 9C17 8.72 16.78 8.5 16.5 8.5Z" fill="hsl(var(--accent))"/>
               <path d="M7.5 8.5C7.22 8.5 7 8.72 7 9C7 9.28 7.22 9.5 7.5 9.5C7.78 9.5 8 9.28 8 9C8 8.72 7.78 8.5 7.5 8.5Z" fill="hsl(var(--accent))"/>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Artify</CardTitle>
          <CardDescription className="text-muted-foreground">
            Generate unique 1:1 cover art for your music using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="songTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="songTitle" className="text-foreground text-lg">Song Title</FormLabel>
                    <FormControl>
                      <Input id="songTitle" placeholder="e.g., Midnight Echoes" {...field} className="focus:ring-accent focus:border-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="artistName" className="text-foreground">Artist Name</FormLabel>
                    <FormControl>
                      <Input id="artistName" placeholder="e.g., The Starlights" {...field} className="focus:ring-accent focus:border-accent" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="themeHint"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-1">
                      <FormLabel htmlFor="themeHint" className="text-foreground">
                        Cover Art Theme Prompt
                      </FormLabel>
                      <div className="flex space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleSuggestTheme} disabled={isSuggestingTheme || isSuggestingMultiple}>
                          {isSuggestingTheme ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Lightbulb className="mr-1 h-3 w-3" />}
                          Suggest Theme
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleSuggestMultipleBackgrounds} disabled={isSuggestingMultiple || isSuggestingTheme}>
                          {isSuggestingMultiple ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                          Suggest Ideas
                        </Button>
                      </div>
                    </div>
                    <FormControl>
                      <Textarea id="themeHint" placeholder="e.g., mystical forest, neon city, abstract waves. Or let AI suggest a theme!" {...field} className="focus:ring-accent focus:border-accent min-h-[80px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {multipleBackgroundSuggestions.length > 0 && !isSuggestingMultiple && (
                <div className="space-y-2 pt-2">
                  <Label className="text-sm text-muted-foreground">Or pick one of these ideas:</Label>
                  <div className="flex flex-wrap gap-2">
                    {multipleBackgroundSuggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                        onClick={() => {
                          form.setValue("themeHint", suggestion);
                          setMultipleBackgroundSuggestions([]); // Clear after selection
                           toast({ title: "Prompt Updated!", description: "Theme prompt set to your selection." });
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isSuggestingTheme || isSuggestingMultiple}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Art
              </Button>
            </form>
          </Form>

          <div className="mt-6 flex flex-col items-center space-y-4">
            <Label className="text-lg font-semibold text-foreground">Your Cover Art</Label>
            <div className="w-full max-w-xs sm:max-w-sm md:max-w-md aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shadow-inner">
              {isLoading ? (
                <div className="flex flex-col items-center text-primary">
                  <Loader2 className="h-16 w-16 animate-spin" />
                  <p className="mt-2 text-sm">Generating your masterpiece...</p>
                </div>
              ) : coverArtDataUri ? (
                <Image
                  src={coverArtDataUri}
                  alt="Generated Cover Art"
                  width={512}
                  height={512}
                  className="object-cover w-full h-full"
                  priority 
                />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <Music2 className="h-24 w-24 mx-auto" />
                  <p className="mt-2">Your generated art will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        {coverArtDataUri && !isLoading && (
          <CardFooter>
            <Button onClick={handleDownload} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Download className="mr-2 h-4 w-4" />
              Download JPG
            </Button>
          </CardFooter>
        )}
      </Card>
      <footer className="text-center py-8 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} Artify. Powered by AI.</p>
      </footer>
    </div>
  );
}
