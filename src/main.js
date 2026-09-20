import * as THREE from 'three';
import './styles/main.css';
import { RoadScene } from './scene/RoadScene.js';
import { AudioController } from './audio/AudioController.js';

/**
 * 3D Celestial Sky & Moon Orchestrator:
 * Focused purely on the 3D Moon sphere with real NASA textures, volumetric clouds, and orbiting 3D bats,
 * with continuous undulating cello soundtrack.
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('webgl-canvas');
  if (!canvas) return;

  // 1. Initialize 3D Celestial Sky Scene
  const roadScene = new RoadScene(canvas);
  window.roadScene = roadScene;
  const clock = new THREE.Clock();

  // 2. Initialize Continuous Cello Theme Audio (50% - 80% undulating cycle)
  const audioController = new AudioController();
  window.audioController = audioController;

  // 3. Render Animation Loop
  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);
    const elapsed = clock.getElapsedTime();

    roadScene.update(delta, elapsed, audioController.getCycleProgress());
  }

  animate();
});

