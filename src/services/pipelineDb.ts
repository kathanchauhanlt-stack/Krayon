/**
 * ═══════════════════════════════════════════════════════════════════════════════
 *  KRAYON — Pipeline Database Service
 * ───────────────────────────────────────────────────────────────────────────────
 *  Typed CRUD operations and real-time subscriptions for the
 *  Light Novel → Comic pipeline stored in Firebase Realtime Database.
 *
 *  All functions target paths under: projects/{projectId}/...
 *  Every write is strongly typed against the interfaces in pipeline.types.ts.
 *
 *  USAGE:
 *    import { createProject, subscribeToPanels } from "@/src/services/pipelineDb";
 *    const projectId = await createProject("u1", "My Epic Manga", "Shonen", "Manga");
 *    subscribeToPanels(projectId, (panels) => { ... });
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  ref,
  set,
  get,
  update,
  push,
  onValue,
  off,
  type DatabaseReference,
  type Unsubscribe,
} from "firebase/database";
import { realtimeDb } from "../firebase/realtimeDb";
import type {
  PipelineProject,
  ProjectMetadata,
  LightNovel,
  LightNovelScene,
  CharacterMap,
  CharacterEntry,
  ComicPanel,
  ComicPanelMap,
  ComicBubble,
  PipelineStatus,
} from "../types/pipeline.types";

// ═══════════════════════════════════════════════════════════════════════════════
//  PATH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns a DatabaseReference to the given path under the projects root */
const projectRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}`);

const metadataRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/metadata`);

const lightNovelRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/light_novel`);

const scenesRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/light_novel/scenes`);

const charactersRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/characters`);

const panelsRef = (projectId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/comic_panels`);

const panelRef = (projectId: string, panelId: string): DatabaseReference =>
  ref(realtimeDb, `projects/${projectId}/comic_panels/${panelId}`);

// ═══════════════════════════════════════════════════════════════════════════════
//  ID GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Generate a unique ID with a descriptive prefix */
const generateId = (prefix: string): string => {
  const pushKey = push(ref(realtimeDb)).key;
  return `${prefix}_${pushKey}`;
};

/** Generate a project ID */
export const generateProjectId = (): string => generateId("proj");

/** Generate a scene ID with zero-padded numbering */
export const generateSceneId = (sceneNumber: number): string =>
  `scene_${String(sceneNumber).padStart(3, "0")}`;

/** Generate a panel ID with zero-padded numbering */
export const generatePanelId = (panelOrder: number): string =>
  `panel_${String(panelOrder).padStart(3, "0")}`;

/** Generate a character ID from their name */
export const generateCharacterId = (name: string): string =>
  `char_${name.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_")}`;

/** Generate a bubble ID */
export const generateBubbleId = (index: number): string =>
  `bubble_${String(index).padStart(2, "0")}`;

// ═══════════════════════════════════════════════════════════════════════════════
//  PROJECT — CREATE / READ / UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new pipeline project in Firebase Realtime Database.
 * Initializes all sub-nodes (metadata, light_novel, characters, comic_panels)
 * with empty defaults.
 *
 * @returns The generated project ID
 */
export async function createProject(
  ownerId: string,
  title: string,
  genre: string,
  globalStyle: string
): Promise<string> {
  const projectId = generateProjectId();
  const now = Date.now();

  const project: PipelineProject = {
    metadata: {
      title,
      genre,
      global_style: globalStyle,
      created_at: now,
      updated_at: now,
      status: "idle",
      owner_id: ownerId,
    },
    light_novel: {
      raw_prompt: "",
      scenes: {},
    },
    characters: {},
    comic_panels: {},
  };

  await set(projectRef(projectId), project);
  return projectId;
}

/**
 * Read the entire project from Firebase.
 * Returns null if the project does not exist.
 */
export async function getProject(
  projectId: string
): Promise<PipelineProject | null> {
  const snapshot = await get(projectRef(projectId));
  return snapshot.exists() ? (snapshot.val() as PipelineProject) : null;
}

/**
 * Update the pipeline status on the project metadata.
 * Automatically bumps `updated_at` timestamp.
 */
export async function updatePipelineStatus(
  projectId: string,
  status: PipelineStatus,
  errorMessage?: string
): Promise<void> {
  const updates: Partial<ProjectMetadata> = {
    status,
    updated_at: Date.now(),
  };
  if (errorMessage !== undefined) {
    updates.error_message = errorMessage;
  }
  await update(metadataRef(projectId), updates);
}

/**
 * Partially update project metadata fields.
 * Only the provided fields will be overwritten — others remain unchanged.
 */
export async function updateMetadata(
  projectId: string,
  fields: Partial<ProjectMetadata>
): Promise<void> {
  await update(metadataRef(projectId), {
    ...fields,
    updated_at: Date.now(),
  });
}

/**
 * Read the project metadata.
 */
export async function getMetadata(
  projectId: string
): Promise<ProjectMetadata | null> {
  const snapshot = await get(metadataRef(projectId));
  return snapshot.exists() ? (snapshot.val() as ProjectMetadata) : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  LIGHT NOVEL — WRITE / READ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write the complete Light Novel (raw prompt + all scenes) to Firebase.
 * This overwrites the entire light_novel node.
 */
export async function setLightNovel(
  projectId: string,
  lightNovel: LightNovel
): Promise<void> {
  await set(lightNovelRef(projectId), lightNovel);
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Read the complete Light Novel from Firebase.
 */
export async function getLightNovel(
  projectId: string
): Promise<LightNovel | null> {
  const snapshot = await get(lightNovelRef(projectId));
  return snapshot.exists() ? (snapshot.val() as LightNovel) : null;
}

/**
 * Read all scenes from the Light Novel.
 */
export async function getScenes(
  projectId: string
): Promise<Record<string, LightNovelScene> | null> {
  const snapshot = await get(scenesRef(projectId));
  return snapshot.exists()
    ? (snapshot.val() as Record<string, LightNovelScene>)
    : null;
}

/**
 * Add or update a single scene in the Light Novel.
 */
export async function setScene(
  projectId: string,
  sceneId: string,
  scene: LightNovelScene
): Promise<void> {
  await set(ref(realtimeDb, `projects/${projectId}/light_novel/scenes/${sceneId}`), scene);
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHARACTERS — WRITE / READ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write the entire character glossary to Firebase.
 * Overwrites all existing characters.
 */
export async function setCharacters(
  projectId: string,
  characters: CharacterMap
): Promise<void> {
  await set(charactersRef(projectId), characters);
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Read the entire character glossary.
 */
export async function getCharacters(
  projectId: string
): Promise<CharacterMap | null> {
  const snapshot = await get(charactersRef(projectId));
  return snapshot.exists() ? (snapshot.val() as CharacterMap) : null;
}

/**
 * Add or update a single character entry.
 */
export async function setCharacter(
  projectId: string,
  characterId: string,
  character: CharacterEntry
): Promise<void> {
  await set(
    ref(realtimeDb, `projects/${projectId}/characters/${characterId}`),
    character
  );
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  COMIC PANELS — WRITE / READ / UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Write the entire comic panels map to Firebase.
 * Overwrites all existing panels — used after Storyboarder Agent completes.
 */
export async function setPanels(
  projectId: string,
  panels: ComicPanelMap
): Promise<void> {
  await set(panelsRef(projectId), panels);
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Read all comic panels for a project.
 */
export async function getPanels(
  projectId: string
): Promise<ComicPanelMap | null> {
  const snapshot = await get(panelsRef(projectId));
  return snapshot.exists() ? (snapshot.val() as ComicPanelMap) : null;
}

/**
 * Read a single comic panel by ID.
 */
export async function getPanel(
  projectId: string,
  panelId: string
): Promise<ComicPanel | null> {
  const snapshot = await get(panelRef(projectId, panelId));
  return snapshot.exists() ? (snapshot.val() as ComicPanel) : null;
}

/**
 * Update a panel's image_url after the Renderer Service (Flux AI) completes.
 * Also sets the panel status to "complete".
 */
export async function updatePanelImageUrl(
  projectId: string,
  panelId: string,
  imageUrl: string
): Promise<void> {
  await update(panelRef(projectId, panelId), {
    image_url: imageUrl,
    status: "complete",
  });
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Update a panel's image_prompt (for user edits / regeneration from the Lab UI).
 * Resets the panel status to "pending" so the Renderer knows to re-process it.
 */
export async function updatePanelPrompt(
  projectId: string,
  panelId: string,
  newPrompt: string
): Promise<void> {
  await update(panelRef(projectId, panelId), {
    image_prompt: newPrompt,
    image_url: null,
    status: "pending",
  });
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Update a panel's bubbles (dialogue / narration editing from the Lab UI).
 */
export async function updatePanelBubbles(
  projectId: string,
  panelId: string,
  bubbles: Record<string, ComicBubble>
): Promise<void> {
  await update(panelRef(projectId, panelId), { bubbles });
  await update(metadataRef(projectId), { updated_at: Date.now() });
}

/**
 * Update a panel's render status (e.g. "rendering" while Flux is processing).
 */
export async function updatePanelStatus(
  projectId: string,
  panelId: string,
  status: ComicPanel["status"]
): Promise<void> {
  await update(panelRef(projectId, panelId), { status });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REAL-TIME SUBSCRIPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Subscribe to real-time updates on all comic panels for a project.
 * The callback fires immediately with the current data and again
 * whenever any panel changes (new image_url, edited bubbles, etc.).
 *
 * @returns An unsubscribe function to detach the listener
 */
export function subscribeToPanels(
  projectId: string,
  callback: (panels: ComicPanelMap | null) => void
): Unsubscribe {
  const dbRef = panelsRef(projectId);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as ComicPanelMap) : null);
  });
  return unsubscribe;
}

/**
 * Subscribe to real-time updates on the entire project.
 * Useful for monitoring pipeline status transitions in the UI.
 *
 * @returns An unsubscribe function to detach the listener
 */
export function subscribeToProject(
  projectId: string,
  callback: (project: PipelineProject | null) => void
): Unsubscribe {
  const dbRef = projectRef(projectId);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as PipelineProject) : null);
  });
  return unsubscribe;
}

/**
 * Subscribe to real-time updates on project metadata only.
 * Lightweight listener for status bar / progress indicators.
 *
 * @returns An unsubscribe function to detach the listener
 */
export function subscribeToMetadata(
  projectId: string,
  callback: (metadata: ProjectMetadata | null) => void
): Unsubscribe {
  const dbRef = metadataRef(projectId);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as ProjectMetadata) : null);
  });
  return unsubscribe;
}
