# Multi-Agent Coordination & Architecture Guide

This project is a multi-stage 3D WebGL / Three.js Halloween interactive experience titled **"All Hallows' Eve"**.

To allow multiple AI agents or chat sessions to work concurrently on different screens without file collisions, merge conflicts, or regressions, adhere strictly to the boundaries and protocols defined below.

---

## 1. Project Architecture & Screen Breakdown

The application is structured into three distinct narrative screens linked by dynamic 3D camera transitions:

```
┌─────────────────────────────────────────────────────────────┐
│ Screen 1: The Celestial Sky & Moon                          │
│ - Looking up into the starry celestial night sky            │
│ - Photorealistic 8K NASA textured 3D moon sphere            │
│ - Multi-layer drifting atmospheric clouds & sky bats         │
│ - 60s cello audio cycle syncing moon & sky color transitions│
│ - Bottom prompt: "scroll to celebrate the eve"              │
└──────────────────────────────┬──────────────────────────────┘
                               │
               [Transition 1: Volumetric Cloud Dive]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Screen 2: The Empty Road, Pumpkin & "All Hallows' Eve"      │
│ - Camera lands on ground asphalt road (sky/moon hidden)     │
│ - 10-lobe ribbed pumpkin mapped with custom texture         │
│ - Menacing carved Jack-o'-Lantern with internal firelight   │
│ - Monumental 3D white text "All Hallows' Eve" (Henny Penny) │
│ - Dark misty perimeter with deep hues & horror cabin shadows │
│ - Interactive click: Honey-thick boiling liquid pour,       │
│   expanding bubbling puddle, rising steam, & bat swarm      │
└──────────────────────────────┬──────────────────────────────┘
                               │
               [Transition 2: To Be Built]
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Screen 3: The Afterworld / Otherworld                       │
│ - Completely distinct visual aesthetic & surreal atmosphere │
│ - Transitioned to from the road / boiling puddle            │
│ - Independent scene graph, shaders, and lighting            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. File Ownership Matrix

Every file in this repository is assigned a strict ownership boundary. **Agents must only edit files belonging to their assigned screen.**

| File Path | Ownership | Description & Constraints |
| :--- | :--- | :--- |
| `src/scene/Moon.js` | **Screen 1** | 3D Moon sphere, NASA texture, Lommel-Seeliger shading, atmospheric glow corona |
| `src/scene/Clouds.js` | **Screen 1** | Procedural cumulus & high veil cloud decks, Mie forward scattering |
| `src/scene/AtmosphereShader.js` | **Screen 1** | Atmospheric sky dome and scattering shaders |
| `src/scene/Road.js` | **Screen 2** | Asphalt road mesh with bump/roughness textures & gravel shoulders |
| `src/scene/Pumpkin.js` | **Screen 2** | 10-lobe pumpkin geometry, carved glowing face, stem, click collider, puncture trigger |
| `src/scene/BoilingLiquid.js` | **Screen 2** | Honey-thick oozing tube, boiling ripple puddle shader, PointLight, rising steam particles |
| `src/scene/HeroText.js` | **Screen 2** | High-res canvas 3D text `"All Hallows' Eve"`, Henny Penny font, AdditiveBlending, lunar hue sync |
| `src/scene/MistyPerimeter.js` | **Screen 2** | Volumetric roadside smoke billows, deep nocturnal hues, distant weathered cabins with glowing windows |
| `src/scene/Bats.js` | **Screen 1 & 2** | Contains two distinct systems (see special rule below):<br>1. Ambient sky flock (`this.bats`)<br>2. Hero text swarm (`this.heroTextBats`) |
| `src/scene/afterworld/*` | **Screen 3** | **Exclusive domain for Screen 3**. All Afterworld meshes, terrains, shaders, and props must live here. |
| `src/scene/AfterworldScene.js` | **Screen 3** | Main entry class for Screen 3. |

### Shared & Orchestration Layer (LOCKED DURING INDEPENDENT WORK)

The following files control the overall pipeline. **Do NOT modify these while developing or refining isolated screens** unless you are specifically tasked with the final integration phase:

| Shared File | Purpose | When to Edit |
| :--- | :--- | :--- |
| `src/scene/RoadScene.js` | Main orchestrator: camera flight, scroll interpolation, audio color dispatch, click delegation. | **Only during integration** when connecting screens or binding final camera transitions. |
| `src/main.js` | WebGL canvas setup, animation loop, audio initiation. | **Only during setup/integration**. |
| `src/audio/AudioController.js` | Dual-player crossfaded cello audio engine, volume undulation, cycle timing. | **Audio changes only**. |
| `index.html` | DOM markup, virtual `#scroll-track`, prompts. | **Only when adding DOM sections/prompts**. |
| `src/styles/main.css` | Global styling, canvas position, scroll container height. | **Only when adjusting scroll length or global UI**. |
| `package.json` | Dependencies. | Only if installing a new Three.js addon or library. |

---

## 3. Special Rule for `src/scene/Bats.js`

`Bats.js` contains two distinct subsystems in one file:
1. **Screen 1 System**: `this.bats`, `initSwarm(9)`, `generateFlightPath()`, `update()` lines 280–360 (ambient sky bats circling the moon).
2. **Screen 2 System**: `this.heroTextBats`, `initHeroTextSwarm(16)`, `triggerHeroTextSwarm()` lines 25–82, `update()` lines 361–402 (black bat swarm swooping across "All Hallows' Eve").

> **Rule**: An agent working on Screen 2 may only modify the `heroTextBats` methods in `Bats.js`. An agent working on Screen 1 may only modify the ambient sky bat methods.

---

## 4. Multi-Chat Parallel Collaboration Protocol

When two or more chats/agents are running simultaneously:

### Agent Assigned to Screen 2 (Pumpkin Scene Refinements)
- **Allowed to edit**: `Pumpkin.js`, `BoilingLiquid.js`, `HeroText.js`, `MistyPerimeter.js`, `Road.js`, and `Bats.js` (`heroTextBats` only).
- **Prohibited from editing**: `Moon.js`, `Clouds.js`, any `src/scene/afterworld/*` files, or shared orchestration files.
- **Workflow**: Make visual, physics, or animation refinements directly in Screen 2 component files. The dev server (`http://localhost:5174/`) will hot-reload without interfering with any other chat.

### Agent Assigned to Screen 3 (Afterworld Development)
- **Allowed to edit**: **ONLY** files inside `src/scene/afterworld/` (create this directory if needed) and `src/scene/AfterworldScene.js`.
- **Prohibited from editing**: Any Screen 1 file, any Screen 2 file, `RoadScene.js`, `main.js`, or `index.html`.
- **Standalone Preview / Dev Mode**:
  - To develop Screen 3 independently, build a self-contained Three.js class:
    ```javascript
    export class AfterworldScene {
      constructor(parentScene, camera) {
        this.group = new THREE.Group();
        // create environment, shaders, lighting
      }
      update(delta, elapsed, cycleProgress) { ... }
      show() { this.group.visible = true; }
      hide() { this.group.visible = false; }
    }
    ```

### Integration Phase (Connecting Screen 2 to Screen 3)
Once both screens are refined and verified independently:
1. **One single agent** is assigned the integration task.
2. That agent will:
   - Expand the scroll track in `index.html` and `main.css` (e.g. increase `#scroll-track` height from `300vh` to `450vh`).
   - Import `AfterworldScene` into `RoadScene.js`.
   - Implement the camera transition (e.g. diving into the glowing bubbling puddle or plunging through a misty vortex into the Afterworld).
   - Verify the smooth 3-stage scroll experience.

---

## 5. Assets & Textures Directory Conventions

- `public/textures/`:
  - `moon texture.jpg`, `cloud texture 1.jpg`, `cloud texture 2.jpg`, `cloud texture 3.jpg` (Screen 1)
  - `pumpkin texture_generated.png`, `road texture_generated.png` (Screen 2)
  - `afterworld/` (Subfolder for any textures generated for Screen 3)
- `public/audio/`:
  - `Halloween-cello-theme.mp3` (Shared audio track)

---

## 6. Verification & Quality Checklist

Before completing any task, every agent must verify:
1. `npm run build` succeeds with zero errors.
2. The browser preview (`http://localhost:5174/`) functions without runtime console exceptions.
3. No dark bounding boxes on transparent textures (`AdditiveBlending` or soft alpha masks).
4. No hardcoded global variables polluting the window object.
