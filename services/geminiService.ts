import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, Character, Dialogue } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStoryline = async (prompt: string): Promise<Scene[]> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on this idea: '${prompt}', generate a compelling anime comic storyline with 5 to 7 scenes. Each scene should have a short title and a detailed description of the action, setting, and dialogue.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {
                                type: Type.STRING,
                                description: 'The title of the scene.',
                            },
                            description: {
                                type: Type.STRING,
                                description: 'The detailed description of the scene, including actions, setting, and dialogue.',
                            },
                        },
                        required: ["title", "description"],
                    },
                },
            },
        });

        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        return parsed.map((scene: Omit<Scene, 'id'>, index: number) => ({ ...scene, id: `scene-${index}` }));
    } catch (error) {
        console.error("Error generating storyline:", error);
        throw new Error("Failed to generate storyline. Please check the console for details.");
    }
};

export const generateCharacters = async (storyline: Scene[]): Promise<Omit<Character, 'id' | 'imageUrl' | 'isGeneratingImage' | 'imageMimeType'>[]> => {
    try {
        const storylineText = storyline.map(s => `${s.title}: ${s.description}`).join('\n');
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze this storyline: '${storylineText}'. Identify up to 3 main characters and create detailed descriptions for each. The descriptions must focus on their physical appearance, hairstyle, clothing, and typical expressions, suitable for an AI image generator. Provide a unique name for each character.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: {
                                type: Type.STRING,
                                description: 'The name of the character.',
                            },
                            description: {
                                type: Type.STRING,
                                description: 'The detailed physical description of the character.',
                            },
                        },
                        required: ["name", "description"],
                    },
                },
            },
        });

        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating characters:", error);
        throw new Error("Failed to generate characters. Please check the console for details.");
    }
};

export const generateCharacterImage = async (description: string, model: string): Promise<{ base64: string, mimeType: string }> => {
    try {
        const response = await ai.models.generateImages({
            model,
            prompt: `A high-quality anime style, full-body character portrait, clean background, of: ${description}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '3:4',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const image = response.generatedImages[0].image;
            return { base64: image.imageBytes, mimeType: image.mimeType };
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating character image:", error);
        throw new Error("Failed to generate character image. Please check the console for details.");
    }
};

export const updateCharacterImage = async (base64Image: string, mimeType: string, updatedDescription: string): Promise<{ base64: string, mimeType: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: `Update the character in the image to match this new description, keeping the same style: ${updatedDescription}` },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
        }
        throw new Error("The model did not return an updated image.");

    } catch (error) {
        console.error("Error updating character image:", error);
        throw new Error("Failed to update character image. Please check the console for details.");
    }
};

export const tweakCharacterWithNaturalLanguage = async (currentDescription: string, command: string): Promise<{ newDescription: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are an AI assistant for character design. A user wants to modify a character.
            
            Current Description:
            ---
            ${currentDescription}
            ---
            
            User's Command:
            ---
            ${command}
            ---
            
            Your task is to rewrite the 'Current Description' to incorporate the user's command. Maintain the original level of detail and structure. Only return the new, complete description.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        newDescription: {
                            type: Type.STRING,
                            description: 'The full, updated character description.',
                        },
                    },
                    required: ["newDescription"],
                },
            },
        });

        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.newDescription) {
            return parsed;
        }
        throw new Error("Model failed to return an updated description.");
    } catch (error) {
        console.error("Error tweaking character description:", error);
        throw new Error("Failed to process tweak command. The AI couldn't update the description.");
    }
};

export const generateScript = async (storyline: Scene[], characters: Character[]): Promise<Scene[]> => {
    try {
        const storylineText = storyline.map(s => `Scene ID: ${s.id}\nTitle: ${s.title}\nDescription: ${s.description}`).join('\n\n');
        const characterNames = characters.map(c => c.name);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a scriptwriter for an anime comic. Based on the following storyline and character list, write a script for each scene.
            
            For each scene, provide a short, impactful narration from a third-person perspective and then write natural-sounding dialogue for the characters present in that scene.
            
            Ensure the character names in the dialogue match exactly from the provided list.
            
            Character List: ${JSON.stringify(characterNames)}
            
            Storyline:
            ---
            ${storylineText}
            ---
            
            Return the result as a JSON array. Each object in the array should correspond to a scene and contain the sceneId, narration, and an array of dialogues.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sceneId: { type: Type.STRING },
                            narration: { type: Type.STRING },
                            dialogues: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        characterName: { type: Type.STRING },
                                        line: { type: Type.STRING }
                                    },
                                    required: ["characterName", "line"]
                                }
                            }
                        },
                        required: ["sceneId", "narration"]
                    }
                }
            },
        });

        const jsonStr = response.text.trim();
        const scriptData: { sceneId: string; narration: string; dialogues: Dialogue[] }[] = JSON.parse(jsonStr);
        
        const scriptMap = new Map(scriptData.map(item => [item.sceneId, { narration: item.narration, dialogues: item.dialogues }]));

        return storyline.map(scene => {
            const script = scriptMap.get(scene.id);
            return {
                ...scene,
                narration: script?.narration || '...',
                dialogues: script?.dialogues || [],
            };
        });

    } catch (error) {
        console.error("Error generating script:", error);
        throw new Error("Failed to generate script. Please check the console for details.");
    }
};

export const generateSceneBackground = async (scene: Scene, model: string): Promise<string> => {
    try {
        const prompt = `High-quality anime comic panel background. Style is dynamic, expressive, and colored. Do NOT include any characters, people, or animals. Focus only on the environment. Scene description: "${scene.description}"`;
        const response = await ai.models.generateImages({
            model,
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
                aspectRatio: '3:4',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("No background image was generated.");
    } catch (error) {
        console.error(`Error generating background for scene "${scene.title}":`, error);
        throw new Error(`Failed to generate background for "${scene.title}".`);
    }
};

export const generateFinalComicPanel = async (scene: Scene, characters: Character[], backgroundBase64: string): Promise<string> => {
    try {
        // Step 1: Identify which characters are in this specific scene.
        const characterNames = characters.map(c => c.name);
        const analysisResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze the following scene description to identify which characters from the provided list are present.
            Character List: ${JSON.stringify(characterNames)}
            Scene Description: "${scene.description}"
            Return a JSON array containing only the names of the characters present in the scene. If no characters are mentioned, return an empty array.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });

        const presentCharacterNames: string[] = JSON.parse(analysisResponse.text.trim());
        const presentCharacters = characters.filter(c => presentCharacterNames.includes(c.name) && c.imageUrl && c.imageMimeType);

        // Step 2: Build the multi-modal prompt for Nano Banana
        const parts: any[] = [
            { inlineData: { data: backgroundBase64, mimeType: 'image/png' } },
        ];

        presentCharacters.forEach(char => {
            parts.push({ inlineData: { data: char.imageUrl!.split(',')[1], mimeType: char.imageMimeType! } });
        });

        const characterListText = presentCharacters.length > 0
            ? `- Following images: The characters to be placed in the scene (${presentCharacters.map(c => c.name).join(', ')}).`
            : `- No character images provided for this scene.`;

        const dialogueText = (scene.dialogues || [])
            .map(d => `${d.characterName}: "${d.line}"`)
            .join('\n');

        const instructionText = `You are an expert comic book artist AI. Your most important task is to render text perfectly.

**Source Materials:**
- First Image: The background for the scene.
${characterListText}

**Artist's Brief:**
1.  **Composition:** Use the first image as the background. Artfully place the character(s) into this background based on the scene description. Their poses, expressions, and placement must match the script's context.
2.  **Style:** Maintain a consistent, high-quality anime art style throughout the panel.

**Text Rendering Rules (Absolute Priority - READ CAREFULLY):**
This is the most critical part of your task. Flawless text is mandatory.
-   **PERFECT SPELLING:** There is ZERO tolerance for spelling errors, typos, or garbled text. Every word must be rendered exactly as written in the script below.
-   **VERBATIM COPYING:** You MUST copy the narration and dialogue text character-for-character. Do not add, omit, or change any words or punctuation.
-   **Narration Box:** If narration is provided, render it inside a clean, rectangular box (typically at the top or bottom of the panel). The font must be a clean, easily readable sans-serif style.
-   **Speech Bubbles:** For each line of dialogue, create a classic comic-book style speech bubble. The tail of the bubble must clearly point to the character who is speaking. Use the same clean, legible font as the narration.

**Script to Render:**
---
Scene Description: "${scene.description}"
Narration: "${scene.narration || 'No narration for this panel.'}"
Dialogue:
${dialogueText || 'No dialogue for this panel.'}
---

**Final Output:** A single, beautifully composited comic panel image with perfectly rendered, 100% accurate text.`;

        parts.push({ text: instructionText });

        // Step 3: Generate the final composited image.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("The model did not return a composited image.");

    } catch (error) {
        console.error(`Error generating final panel for scene "${scene.title}":`, error);
        throw new Error(`Failed to composite final panel for "${scene.title}".`);
    }
};

export const tweakComicPanel = async (base64Image: string, mimeType: string, command: string): Promise<{ base64: string, mimeType: string }> => {
    try {
        const promptText = `You are an AI comic book artist assistant. Your task is to modify an existing comic panel based on a user's instruction.

**Input:**
1. An existing comic panel image.
2. A user's command for modification.

**User Command:**
---
${command}
---

**Instructions:**
1. Carefully analyze the user's command.
2. Apply the requested changes directly to the provided image.
3. Maintain the original art style, colors, and characters as much as possible, unless the command specifically asks to change them.
4. Your final output MUST be only the modified image. Do not return text descriptions, only the final image.`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType } },
                    { text: promptText },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return { base64: imagePart.inlineData.data, mimeType: imagePart.inlineData.mimeType };
        }
        throw new Error("The model did not return an updated panel image.");
    } catch (error) {
        console.error("Error tweaking comic panel:", error);
        throw new Error("Failed to tweak comic panel.");
    }
};

export const generateCoverPanel = async (characters: Character[], comicTitle: string, model: string): Promise<string> => {
    try {
        // Step 1: Generate a dramatic background.
        const bgResponse = await ai.models.generateImages({
            model,
            prompt: `An epic and dramatic anime comic book cover background. Vibrant colors, dynamic lighting. No characters or text.`,
            config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '3:4' },
        });

        if (!bgResponse.generatedImages || bgResponse.generatedImages.length === 0) {
            throw new Error("Failed to generate cover background.");
        }
        const backgroundBase64 = bgResponse.generatedImages[0].image.imageBytes;

        // Step 2: Composite characters onto the background.
        const parts: any[] = [{ inlineData: { data: backgroundBase64, mimeType: 'image/png' } }];

        characters.forEach(char => {
            if (char.imageUrl && char.imageMimeType) {
                parts.push({ inlineData: { data: char.imageUrl.split(',')[1], mimeType: char.imageMimeType } });
            }
        });

        const characterNames = characters.map(c => c.name).join(', ');
        const instructionText = `You are a world-class comic book cover artist AI. Your primary mission is to create a stunning cover with a perfectly rendered title.

**Project:** Comic Cover
**Title:** "${comicTitle}"

**Instructions:**
1.  **Background & Characters:** Use the first provided image as the background. Composite the subsequent character images onto this background in dynamic, heroic poses.
2.  **Title Rendering (CRITICAL - HIGHEST PRIORITY):**
    -   **ABSOLUTE ACCURACY:** The comic title MUST be rendered **EXACTLY** as: "${comicTitle}". There is no room for spelling errors, typos, or misplaced letters. Double-check every character.
    -   **LEGIBILITY:** The title must be highly legible. Use a bold, impactful, comic-book style font.
    -   **VISIBILITY:** Ensure the text stands out from the background art. Use techniques like a contrasting color, a strong outline, or a subtle drop shadow to maximize readability.
    -   **INTEGRATION:** Artistically integrate the title into the overall composition. It should feel like a core part of the cover, not an afterthought.

**Final Output:** A single, professional, high-quality comic book cover image where the title text is 100% accurate and visually stunning.`;

        parts.push({ text: instructionText });

        const compositeResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imagePart = compositeResponse.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        }
        throw new Error("The model did not return a cover image.");
    } catch (error) {
        console.error("Error generating cover panel:", error);
        throw new Error("Failed to create the comic cover.");
    }
};

export const generateBackCoverPanel = async (characters: Character[]): Promise<string> => {
    try {
        const mainCharacter = characters.find(c => c.imageUrl && c.imageMimeType);

        if (mainCharacter) {
            const parts: any[] = [{
                inlineData: {
                    data: mainCharacter.imageUrl!.split(',')[1],
                    mimeType: mainCharacter.imageMimeType!,
                }
            }];

            const instructionText = `You are a graphic designer AI creating a stylish back cover for an anime comic. Your most important task is perfect text rendering.

**Instructions:**
1.  **Composition:** Use the provided character image to create an artistic back cover. You can use it as a faded silhouette, a semi-transparent overlay, or frame it stylistically. The mood should be conclusive and elegant.
2.  **Text Rendering (CRITICAL - ZERO MISTAKES ALLOWED):**
    -   **Primary Text:** Render the phrase "The End" prominently. Use a large, stylish, and highly legible font suitable for an anime comic. It must be spelled **EXACTLY** as "T-h-e- -E-n-d".
    -   **Credit Line:** At the bottom, in a smaller, clean font, render the credit line **EXACTLY** as: "Created with SONICS.ai".
    -   **ACCURACY IS PARAMOUNT:** All text must be perfectly spelled and rendered. No typos, no extra characters, no omissions.

**Final Output:** A single, high-quality back cover image with 100% accurate and well-placed text.`;

            parts.push({ text: instructionText });

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts },
                config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                return imagePart.inlineData.data;
            }
            throw new Error("The model did not return a back cover image.");

        } else {
            const prompt = `Create a stylish back cover for an anime comic. The background should be a dark, abstract, subtly textured design. 
- In the center, in a large, elegant, and highly legible font, place the text **EXACTLY** as "The End". 
- Below it, in a smaller, clean font, add the credit **EXACTLY** as "Created with SONICS.ai". 
- The entire image must be high-quality with a minimalist aesthetic, in a 3:4 portrait aspect ratio.
- **CRITICAL:** There is zero tolerance for spelling errors or typos. The text must be rendered perfectly.`;

            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: { numberOfImages: 1, outputMimeType: 'image/png', aspectRatio: '3:4' },
            });
            if (response.generatedImages && response.generatedImages.length > 0) {
                return response.generatedImages[0].image.imageBytes;
            }
            throw new Error("The model did not generate a back cover image.");
        }
    } catch (error) {
        console.error("Error generating back cover:", error);
        throw new Error("Failed to create the back cover.");
    }
};