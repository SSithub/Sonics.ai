export enum AppStatus {
  PROMPT,
  STORYLINE,
  CHARACTERS,
  SCRIPTING,
  PANEL_GENERATION,
  COMIC,
}

export interface Dialogue {
  characterName: string;
  line: string;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  narration?: string;
  dialogues?: Dialogue[];
}

export interface Character {
  id:string;
  name: string;
  description: string;
  imageUrl: string | null;
  isGeneratingImage: boolean;
  imageMimeType: string | null;
}

export interface ComicPanel {
  scene: Scene; // For covers, this will have a simplified structure
  panelType: 'COVER' | 'SCENE' | 'BACK';
  finalImageUrl: string | null;
  backgroundImageUrl: string | null;
  status: 'NOT_STARTED' | 'GENERATING' | 'UPDATING' | 'DONE' | 'FAILED';
}