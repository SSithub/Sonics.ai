import React, { useState, useCallback } from 'react';
import { AppStatus, Scene, Character, ComicPanel, Dialogue } from './types';
import * as geminiService from './services/geminiService';
import Header from './components/Header';
import Loader from './components/Loader';

const App: React.FC = () => {
    const [status, setStatus] = useState<AppStatus>(AppStatus.PROMPT);
    const [prompt, setPrompt] = useState<string>('');
    const [comicTitle, setComicTitle] = useState<string>('');
    const [storyline, setStoryline] = useState<Scene[]>([]);
    const [characters, setCharacters] = useState<Character[]>([]);
    const [panels, setPanels] = useState<ComicPanel[]>([]);
    const [tweakInputs, setTweakInputs] = useState<string[]>([]);
    const [panelTweakInputs, setPanelTweakInputs] = useState<string[]>([]);
    const [selectedImagenModel, setSelectedImagenModel] = useState<string>('imagen-4.0-generate-001');
    
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    const downloadFile = (content: string, fileName: string, mimeType: string) => {
        if (content.startsWith('data:')) {
            const a = document.createElement('a');
            a.href = content;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    };

    const handleReset = () => {
        setStatus(AppStatus.PROMPT);
        setPrompt('');
        setComicTitle('');
        setStoryline([]);
        setCharacters([]);
        setPanels([]);
        setTweakInputs([]);
        setPanelTweakInputs([]);
        setIsLoading(false);
        setLoadingMessage('');
        setError(null);
    };

    const handleGenerateStoryline = async () => {
        if (!prompt.trim()) {
            setError("Please enter a prompt for your comic.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Crafting your epic storyline...");
        try {
            const newStoryline = await geminiService.generateStoryline(prompt);
            setStoryline(newStoryline);
            setComicTitle(prompt);
            setStatus(AppStatus.STORYLINE);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStorylineChange = (index: number, newDescription: string) => {
        setStoryline(prev => prev.map((scene, i) => i === index ? { ...scene, description: newDescription } : scene));
    };

    const handleDownloadStoryline = () => {
        const content = storyline.map(scene => 
            `Scene: ${scene.title}\n-----------------\n${scene.description}\n\n`
        ).join('');
        downloadFile(content, 'storyline.txt', 'text/plain');
    };

    const handleFinalizeStoryline = async () => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Designing your main characters...");
        try {
            const newCharactersData = await geminiService.generateCharacters(storyline);
            const newCharacters = newCharactersData.map((char, index) => ({
                ...char,
                id: `char-${index}`,
                imageUrl: null,
                isGeneratingImage: false,
                imageMimeType: null,
            }));
            setCharacters(newCharacters);
            setTweakInputs(new Array(newCharacters.length).fill(''));
            setStatus(AppStatus.CHARACTERS);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCharacterDescChange = (index: number, newDescription: string) => {
        setCharacters(prev => prev.map((char, i) => i === index ? { ...char, description: newDescription } : char));
    };

    const handleGenerateCharacterImage = useCallback(async (index: number) => {
        setError(null);
        const char = characters[index];
        setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: true } : c));
        try {
            const { base64, mimeType } = await geminiService.generateCharacterImage(char.description, selectedImagenModel);
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, imageUrl: `data:${mimeType};base64,${base64}`, imageMimeType: mimeType } : c));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: false } : c));
        }
    }, [characters, selectedImagenModel]);

    const handleUpdateCharacterImage = useCallback(async (index: number) => {
        setError(null);
        const char = characters[index];
        if (!char.imageUrl || !char.imageMimeType) return;
        
        const base64Data = char.imageUrl.split(',')[1];
        setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: true } : c));
        try {
            const { base64, mimeType } = await geminiService.updateCharacterImage(base64Data, char.imageMimeType, char.description);
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, imageUrl: `data:${mimeType};base64,${base64}`, imageMimeType: mimeType } : c));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: false } : c));
        }
    }, [characters]);

    const handleTweakInputChange = (index: number, value: string) => {
        setTweakInputs(prev => prev.map((input, i) => i === index ? value : input));
    };

    const handleTweakCharacter = useCallback(async (index: number) => {
        const command = tweakInputs[index];
        if (!command.trim()) {
            setError("Please enter a tweak command.");
            return;
        }

        const char = characters[index];
        if (!char.imageUrl || !char.imageMimeType) {
            setError("Please generate an initial image before tweaking.");
            return;
        }
        
        setError(null);
        setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: true } : c));
        
        try {
            const { newDescription } = await geminiService.tweakCharacterWithNaturalLanguage(char.description, command);
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, description: newDescription } : c));
            setTweakInputs(prev => prev.map((t, i) => i === index ? '' : t));
            const base64Data = char.imageUrl.split(',')[1];
            const { base64, mimeType } = await geminiService.updateCharacterImage(base64Data, char.imageMimeType, newDescription);
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, imageUrl: `data:${mimeType};base64,${base64}`, imageMimeType: mimeType } : c));
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setCharacters(prev => prev.map((c, i) => i === index ? { ...c, isGeneratingImage: false } : c));
        }
    }, [characters, tweakInputs]);
    
    const handleDownloadCharacters = () => {
        const content = characters.map(char => 
            `# ${char.name}\n\n## Description\n\n${char.description}\n\n---\n\n`
        ).join('');
        downloadFile(content, 'character-profiles.md', 'text/markdown');
    };

    const handleGenerateScript = async () => {
        if (characters.some(c => !c.imageUrl)) {
            setError("Please generate an image for all characters before writing the script.");
            return;
        }
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Writing your comic's script...");
        try {
            const scriptedStoryline = await geminiService.generateScript(storyline, characters);
            setStoryline(scriptedStoryline);
            setStatus(AppStatus.SCRIPTING);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceedToPanelGeneration = () => {
        const coverPanel: ComicPanel = {
            scene: { id: 'cover-page', title: `Cover: ${comicTitle}`, description: '', dialogues: [], narration: '' },
            panelType: 'COVER', finalImageUrl: null, backgroundImageUrl: null, status: 'NOT_STARTED',
        };
        const scenePanels: ComicPanel[] = storyline.map(scene => ({
            scene, panelType: 'SCENE', finalImageUrl: null, backgroundImageUrl: null, status: 'NOT_STARTED',
        }));
        const backCoverPanel: ComicPanel = {
            scene: { id: 'back-cover', title: 'The End', description: '', dialogues: [], narration: '' },
            panelType: 'BACK', finalImageUrl: null, backgroundImageUrl: null, status: 'NOT_STARTED',
        };
        const allPanels = [coverPanel, ...scenePanels, backCoverPanel];
        setPanels(allPanels);
        setPanelTweakInputs(new Array(allPanels.length).fill(''));
        setStatus(AppStatus.PANEL_GENERATION);
    };

    const handleNarrationChange = (sceneIndex: number, newNarration: string) => {
        setStoryline(prev => prev.map((scene, i) => i === sceneIndex ? { ...scene, narration: newNarration } : scene));
    };

    const handleDialogueChange = (sceneIndex: number, dialogueIndex: number, newLine: string) => {
        setStoryline(prev => prev.map((scene, i) => {
            if (i === sceneIndex) {
                const newDialogues = scene.dialogues?.map((dialogue, j) => j === dialogueIndex ? { ...dialogue, line: newLine } : dialogue);
                return { ...scene, dialogues: newDialogues };
            }
            return scene;
        }));
    };

     const handleDownloadScript = () => {
        const content = storyline.map(scene => {
            const dialogues = (scene.dialogues || [])
                .map(d => `    ${d.characterName}: ${d.line}`)
                .join('\n');
            return `## Scene: ${scene.title}\n\n**Narration:**\n${scene.narration || 'N/A'}\n\n**Dialogue:**\n${dialogues.length > 0 ? dialogues : 'No dialogue.'}\n\n-----------------\n\n`;
        }).join('');
        downloadFile(content, 'comic-script.txt', 'text/plain');
    };

    const handleGeneratePanel = async (panelIndex: number) => {
        setError(null);
        setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'GENERATING' } : p));
        const panel = panels[panelIndex];
        try {
            let imageBase64: string;
            let bgBase64: string | null = null;
            
            switch (panel.panelType) {
                case 'COVER':
                    imageBase64 = await geminiService.generateCoverPanel(characters, comicTitle, selectedImagenModel);
                    break;
                case 'SCENE':
                    const currentScene = storyline.find(s => s.id === panel.scene.id)!;
                    bgBase64 = await geminiService.generateSceneBackground(currentScene, selectedImagenModel);
                    imageBase64 = await geminiService.generateFinalComicPanel(currentScene, characters, bgBase64);
                    break;
                case 'BACK':
                    imageBase64 = await geminiService.generateBackCoverPanel(characters);
                    break;
            }
            
            setPanels(prev => prev.map((p, i) => i === panelIndex ? {
                ...p,
                finalImageUrl: `data:image/png;base64,${imageBase64}`,
                backgroundImageUrl: bgBase64 ? `data:image/png;base64,${bgBase64}` : null,
                status: 'DONE'
            } : p));
        } catch (e) {
            setError((e as Error).message);
            setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'FAILED' } : p));
        }
    };

    const handleUpdatePanelFromText = async (panelIndex: number) => {
        setError(null);
        const panel = panels[panelIndex];
        if (panel.panelType !== 'SCENE' || !panel.backgroundImageUrl) return;

        setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'UPDATING' } : p));

        try {
            const currentScene = storyline.find(s => s.id === panel.scene.id)!;
            const bgBase64 = panel.backgroundImageUrl.split(',')[1];
            const finalImageBase64 = await geminiService.generateFinalComicPanel(currentScene, characters, bgBase64);

            setPanels(prev => prev.map((p, i) => i === panelIndex ? {
                ...p,
                finalImageUrl: `data:image/png;base64,${finalImageBase64}`,
                status: 'DONE'
            } : p));
        } catch (e) {
            setError((e as Error).message);
            setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'FAILED' } : p));
        }
    };

    const handlePanelTweakInputChange = (index: number, value: string) => {
        setPanelTweakInputs(prev => prev.map((input, i) => i === index ? value : input));
    };

    const handleTweakPanel = async (panelIndex: number) => {
        const command = panelTweakInputs[panelIndex];
        if (!command.trim()) return;

        setError(null);
        const panel = panels[panelIndex];
        if (!panel.finalImageUrl) return;

        setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'UPDATING' } : p));
        
        try {
            const base64Data = panel.finalImageUrl.split(',')[1];
            const { base64, mimeType } = await geminiService.tweakComicPanel(base64Data, 'image/png', command);

            setPanels(prev => prev.map((p, i) => i === panelIndex ? {
                ...p, finalImageUrl: `data:${mimeType};base64,${base64}`, status: 'DONE'
            } : p));
            setPanelTweakInputs(prev => prev.map((t, i) => i === panelIndex ? '' : t));
        } catch (e) {
            setError((e as Error).message);
            setPanels(prev => prev.map((p, i) => i === panelIndex ? { ...p, status: 'FAILED' } : p));
        }
    };

    const handleDownloadPdf = async () => {
        setError(null);
        setIsLoading(true);
        setLoadingMessage("Generating your comic PDF...");
        try {
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF('p', 'pt', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 40;
            const imgWidth = pageWidth - margin * 2;
            const imgHeight = imgWidth * (4 / 3);
            const x = margin;
            const y = (pageHeight - imgHeight) / 2;

            for (let i = 0; i < panels.length; i++) {
                const panel = panels[i];
                if (panel.finalImageUrl) {
                    if (i > 0) {
                        pdf.addPage();
                    }
                    await new Promise<void>(resolve => {
                        const img = new Image();
                        img.src = panel.finalImageUrl!;
                        img.onload = () => {
                            pdf.addImage(img, 'PNG', x, y, imgWidth, imgHeight);
                            resolve();
                        };
                        img.onerror = () => {
                            console.error(`Failed to load image for panel ${panel.scene.id}`);
                            resolve(); 
                        }
                    });
                }
            }
            pdf.save(`${comicTitle.replace(/[^a-zA-Z0-9]/g, '_') || 'comic'}.pdf`);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderContent = () => {
        if (isLoading) {
            return <Loader message={loadingMessage} />;
        }

        switch (status) {
            case AppStatus.PROMPT:
                return (
                    <div className="w-full max-w-2xl mx-auto">
                        <textarea
                            className="w-full p-4 bg-gray-800 border-2 border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200"
                            rows={4}
                            placeholder="A lost cyborg searching for her creator in a neon-drenched city..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <button onClick={handleGenerateStoryline} className="mt-4 w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition duration-200 shadow-lg">
                            Generate Storyline
                        </button>
                    </div>
                );

            case AppStatus.STORYLINE:
                return (
                    <div className="w-full max-w-4xl mx-auto">
                        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
                             <label htmlFor="comic-title-input" className="block text-lg font-medium text-white mb-2">
                                Comic Title
                            </label>
                            <input
                                id="comic-title-input"
                                type="text"
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-1 focus:ring-purple-500"
                                value={comicTitle}
                                onChange={(e) => setComicTitle(e.target.value)}
                                placeholder="Enter your comic title"
                            />
                            <p className="text-sm text-gray-400 mt-2">
                                This title will be used for the cover and filenames.
                            </p>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-4">Your Storyline</h2>
                        <div className="space-y-4">
                            {storyline.map((scene, index) => (
                                <div key={scene.id} className="bg-gray-800 p-4 rounded-lg">
                                    <h3 className="font-bold text-purple-400">{scene.title}</h3>
                                    <textarea
                                        className="w-full mt-2 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-purple-500"
                                        rows={3}
                                        value={scene.description}
                                        onChange={(e) => handleStorylineChange(index, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-6 flex flex-col md:flex-row gap-4">
                            <button onClick={handleDownloadStoryline} className="w-full md:w-auto py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-200">
                                Download Storyline (.txt)
                            </button>
                            <button onClick={handleFinalizeStoryline} className="w-full md:flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition duration-200 shadow-lg">
                                Finalize Storyline & Design Characters
                            </button>
                        </div>
                    </div>
                );

            case AppStatus.CHARACTERS:
                return (
                    <div className="w-full max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">Character Design</h2>
                        <div className="mb-6 bg-gray-800 p-4 rounded-lg">
                            <label htmlFor="imagen-model-select" className="block text-lg font-medium text-white mb-2">
                                Image Generation Model
                            </label>
                            <select
                                id="imagen-model-select"
                                value={selectedImagenModel}
                                onChange={(e) => setSelectedImagenModel(e.target.value)}
                                className="w-full md:w-1/3 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="imagen-4.0-generate-001">Imagen 4.0</option>
                                <option value="imagen-3.0-generate-002">Imagen 3.0</option>
                            </select>
                            <p className="text-sm text-gray-400 mt-2">
                                Select the model to use for all image generation steps (characters, panels, covers).
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {characters.map((char, index) => (
                                <div key={char.id} className="bg-gray-800 p-4 rounded-lg flex flex-col space-y-4">
                                    <h3 className="font-bold text-purple-400 text-lg">{char.name}</h3>
                                    <div className="aspect-[3/4] bg-gray-700 rounded-md flex items-center justify-center relative overflow-hidden">
                                        {char.isGeneratingImage && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10"><Loader message="Generating..." /></div>}
                                        {char.imageUrl ? <img src={char.imageUrl} alt={char.name} className="object-cover w-full h-full" /> : <div className="text-gray-400">Click "Generate Image"</div>}
                                    </div>
                                    {char.imageUrl && (
                                        <button 
                                            onClick={() => downloadFile(char.imageUrl!, `${char.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`, 'image/png')}
                                            className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition duration-200 disabled:bg-gray-800 disabled:cursor-not-allowed"
                                            disabled={char.isGeneratingImage}
                                        >
                                            Download Image
                                        </button>
                                    )}
                                    <div>
                                        <label className="text-sm font-medium text-gray-300">Description</label>
                                        <textarea className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-purple-500" rows={5} value={char.description} onChange={(e) => handleCharacterDescChange(index, e.target.value)} />
                                    </div>
                                    {char.imageUrl && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-300">Tweak with natural language</label>
                                         <div className="flex gap-2 mt-1">
                                            <input type="text" placeholder="e.g., give her blue hair" className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-purple-500" value={tweakInputs[index]} onChange={(e) => handleTweakInputChange(index, e.target.value)} disabled={char.isGeneratingImage} />
                                            <button onClick={() => handleTweakCharacter(index)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition duration-200 disabled:bg-purple-900" disabled={char.isGeneratingImage}>Tweak</button>
                                        </div>
                                    </div>
                                    )}
                                    <div className="flex gap-2">
                                        <button onClick={() => handleGenerateCharacterImage(index)} className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-200 disabled:bg-indigo-900" disabled={char.isGeneratingImage}>{char.imageUrl ? 'Re-generate' : 'Generate Image'}</button>
                                        {char.imageUrl && <button onClick={() => handleUpdateCharacterImage(index)} className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition duration-200 disabled:bg-green-900" disabled={char.isGeneratingImage}>Update Image</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="mt-8 flex flex-col md:flex-row gap-4">
                            <button onClick={handleDownloadCharacters} className="w-full md:w-auto py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-200">Download Profiles (.md)</button>
                            <button onClick={handleGenerateScript} className="w-full md:flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition duration-200 shadow-lg" disabled={characters.some(c => !c.imageUrl)}>Finalize Characters & Write Script</button>
                        </div>
                    </div>
                );

            case AppStatus.SCRIPTING:
                return (
                    <div className="w-full max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">Final Script</h2>
                        <div className="space-y-6">
                            {storyline.map((scene, sceneIndex) => (
                                <div key={scene.id} className="bg-gray-800 p-4 rounded-lg">
                                    <h3 className="font-bold text-purple-400 text-xl">{scene.title}</h3>
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-gray-300">Narration</label>
                                        <textarea className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-purple-500" rows={2} value={scene.narration} onChange={(e) => handleNarrationChange(sceneIndex, e.target.value)} />
                                    </div>
                                    <div className="mt-4">
                                        <label className="text-sm font-medium text-gray-300">Dialogue</label>
                                        <div className="space-y-2 mt-1">
                                            {(scene.dialogues && scene.dialogues.length > 0) ? scene.dialogues.map((dialogue, dialogueIndex) => (
                                                <div key={dialogueIndex} className="flex items-center gap-2">
                                                    <span className="font-semibold text-indigo-400 w-1/4">{dialogue.characterName}:</span>
                                                    <input type="text" className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:ring-1 focus:ring-purple-500" value={dialogue.line} onChange={(e) => handleDialogueChange(sceneIndex, dialogueIndex, e.target.value)} />
                                                </div>
                                            )) : <p className="text-gray-400 italic">No dialogue in this scene.</p>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="mt-6 flex flex-col md:flex-row gap-4">
                            <button onClick={handleDownloadScript} className="w-full md:w-auto py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-200">Download Script (.txt)</button>
                            <button onClick={handleProceedToPanelGeneration} className="w-full md:flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition duration-200 shadow-lg">Proceed to Panel Generation</button>
                        </div>
                    </div>
                );
            
            case AppStatus.PANEL_GENERATION:
                const isAllDone = panels.every(p => p.status === 'DONE');
                return (
                    <div className="w-full max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">Panel Generation</h2>
                        <div className="space-y-8">
                            {panels.map((panel, index) => {
                                const sceneIndex = storyline.findIndex(s => s.id === panel.scene.id);
                                const isLoadingPanel = panel.status === 'GENERATING' || panel.status === 'UPDATING';
                                return (
                                <div key={index} className="bg-gray-800 p-4 rounded-lg">
                                    <h3 className="font-bold text-purple-400 text-xl">{panel.scene.title}</h3>
                                    {panel.panelType === 'SCENE' && (
                                        <div className="mt-4 border-b border-gray-700 pb-4">
                                             <label className="text-sm font-medium text-gray-300">Narration</label>
                                             <textarea className="w-full mt-1 p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300" rows={2} value={storyline[sceneIndex].narration} onChange={(e) => handleNarrationChange(sceneIndex, e.target.value)} disabled={isLoadingPanel} />
                                             <label className="text-sm font-medium text-gray-300 mt-2 block">Dialogue</label>
                                             <div className="space-y-2 mt-1">
                                                {(storyline[sceneIndex].dialogues && storyline[sceneIndex].dialogues!.length > 0) ? storyline[sceneIndex].dialogues!.map((dialogue, dialogueIndex) => (
                                                    <div key={dialogueIndex} className="flex items-center gap-2">
                                                        <span className="font-semibold text-indigo-400 w-1/4">{dialogue.characterName}:</span>
                                                        <input type="text" className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300" value={dialogue.line} onChange={(e) => handleDialogueChange(sceneIndex, dialogueIndex, e.target.value)} disabled={isLoadingPanel} />
                                                    </div>
                                                )) : <p className="text-gray-400 italic">No dialogue in this scene.</p>}
                                            </div>
                                        </div>
                                    )}
                                    <div className="aspect-[3/4] mt-4 bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden">
                                        {isLoadingPanel && <div className="absolute inset-0 bg-black/60 z-10"><Loader message={panel.status === 'GENERATING' ? 'Generating...' : 'Updating...'} /></div>}
                                        {panel.status === 'FAILED' && <div className="text-red-400 font-bold p-4 text-center">Generation Failed</div>}
                                        {panel.finalImageUrl ? <img src={panel.finalImageUrl} alt={panel.scene.title} className="object-contain w-full h-full" /> : panel.status !== 'FAILED' && <div className="text-gray-400">Panel not generated yet.</div>}
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {panel.status === 'DONE' && (
                                            <button onClick={() => downloadFile(panel.finalImageUrl!, `${panel.scene.id}.png`, 'image/png')} className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition duration-200" disabled={isLoadingPanel}>
                                                Download Panel
                                            </button>
                                        )}
                                        {panel.status === 'DONE' && panel.panelType === 'SCENE' && <button onClick={() => handleUpdatePanelFromText(index)} className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition duration-200" disabled={isLoadingPanel}>Update Panel from Text</button>}
                                        {panel.status === 'DONE' && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-300">Tweak panel with natural language</label>
                                            <div className="flex gap-2 mt-1">
                                                <input type="text" placeholder="e.g., make the sky red" className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300" value={panelTweakInputs[index]} onChange={(e) => handlePanelTweakInputChange(index, e.target.value)} disabled={isLoadingPanel} />
                                                <button onClick={() => handleTweakPanel(index)} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md transition duration-200 disabled:bg-purple-900" disabled={isLoadingPanel}>Tweak Image</button>
                                            </div>
                                        </div>
                                        )}
                                        {panel.status === 'NOT_STARTED' || panel.status === 'FAILED' ? <button onClick={() => handleGeneratePanel(index)} className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-200">{panel.status === 'FAILED' ? 'Retry Generation' : 'Generate Panel'}</button> : null}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                        <div className="mt-8">
                            <button onClick={() => setStatus(AppStatus.COMIC)} className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition duration-200 shadow-lg disabled:bg-indigo-900 disabled:cursor-not-allowed" disabled={!isAllDone}>
                                {isAllDone ? 'Finish & View Comic' : 'Generate all panels to continue'}
                            </button>
                        </div>
                    </div>
                );

            case AppStatus.COMIC:
                return (
                     <div className="w-full max-w-7xl mx-auto">
                        <h2 className="text-3xl font-bold text-white mb-6 text-center">Your Finished Comic!</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {panels.map((panel, index) => (
                                <div key={index} className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col">
                                    <h3 className="font-bold text-purple-400 text-xl mb-4 text-center truncate">{panel.scene.title}</h3>
                                    <div className="aspect-[3/4] bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden">
                                        {panel.finalImageUrl ? <img src={panel.finalImageUrl} alt={panel.scene.title} className="object-contain w-full h-full" /> : <div className="text-gray-400">Image not available</div>}
                                    </div>
                                     {panel.finalImageUrl && (
                                        <button onClick={() => downloadFile(panel.finalImageUrl!, `${panel.scene.id}.png`, 'image/png')} className="mt-4 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition duration-200">
                                            Download Panel
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-col md:flex-row gap-4">
                             <button onClick={handleDownloadPdf} className="w-full md:flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition duration-200 shadow-lg">
                                Download Comic (PDF)
                            </button>
                            <button onClick={handleReset} className="w-full md:flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition duration-200">
                                Start Over
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans p-4 md:p-8">
            <Header />
            <main className="container mx-auto mt-8">
                {error && (
                    <div className="mb-4 p-4 bg-red-800/50 border border-red-700 text-red-300 rounded-lg">
                        <p className="font-bold">An error occurred:</p>
                        <p>{error}</p>
                    </div>
                )}
                {renderContent()}
            </main>
        </div>
    );
};

export default App;