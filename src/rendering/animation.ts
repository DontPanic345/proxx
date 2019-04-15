/**
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { easeInOutCubic, easeOutQuad } from "./animation-helpers.js";
import {
  flashInAnimationLength,
  flashOutAnimationLength,
  idleAnimationLength,
  turquoise
} from "./constants.js";
import { cacheTextureGenerator } from "./texture-cache.js";
import {
  idleAnimationTextureGeneratorFactory,
  STATIC_TEXTURE,
  staticTextureGeneratorFactory,
  TextureGenerator
} from "./texture-generators.js";

// Enum of all the available animations
export const enum AnimationName {
  IDLE,
  FLASH_IN,
  FLASH_OUT,
  NUMBER,
  FLAGGED
}

export interface AnimationDesc {
  name: AnimationName;
  start: number;
  done?: () => void;
}

export interface Context {
  ts: number;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  animation: AnimationDesc;
}

// Calls and unsets the `done` callback if available.
function processDoneCallback(animation: AnimationDesc) {
  if (!animation.done) {
    return;
  }
  animation.done();
  delete animation.done;
}

export function idleAnimation({ ts, ctx, animation }: Context) {
  const animationLength = 5000;
  const normalized = ((ts - animation.start) / animationLength) % 1;
  const idx = Math.floor(normalized * 300);
  ctx.save();
  ctx.globalAlpha = 0.3;
  idleAnimationTextureGenerator!(idx, ctx);
  ctx.globalAlpha = 1;
  staticTextureGenerator!(STATIC_TEXTURE.OUTLINE, ctx);
  ctx.restore();
}

export function flaggedAnimation({
  ts,
  ctx,
  width,
  height,
  animation
}: Context) {
  const animationLength = idleAnimationLength;
  const normalized = ((ts - animation.start) / animationLength) % 1;
  const idx = Math.floor(normalized * 300);

  ctx.save();
  idleAnimationTextureGenerator!(idx, ctx);
  staticTextureGenerator!(STATIC_TEXTURE.OUTLINE, ctx);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = turquoise;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

export function numberAnimation(
  touching: number,
  canDoSurroundingReveal: boolean,
  { ctx, width, height }: Context
) {
  ctx.save();
  staticTextureGenerator!(touching, ctx);

  if (canDoSurroundingReveal) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = turquoise;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

export function flashInAnimation({ ts, ctx, animation }: Context) {
  const animationLength = flashInAnimationLength;
  let normalized = (ts - animation.start) / animationLength;
  if (normalized < 0) {
    return;
  }
  if (normalized > 1) {
    processDoneCallback(animation);
    normalized = 1;
  }
  ctx.save();
  ctx.globalAlpha = easeOutQuad(normalized);
  staticTextureGenerator!(STATIC_TEXTURE.FLASH, ctx);
  ctx.restore();
}

export function flashOutAnimation({ ts, ctx, animation }: Context) {
  const animationLength = flashOutAnimationLength;
  let normalized = (ts - animation.start) / animationLength;
  if (normalized < 0) {
    return;
  }
  if (normalized > 1) {
    processDoneCallback(animation);
    normalized = 1;
  }
  ctx.save();
  ctx.globalAlpha = 1 - easeInOutCubic(normalized);
  staticTextureGenerator!(STATIC_TEXTURE.FLASH, ctx);
  ctx.restore();
}

let idleAnimationTextureGenerator: TextureGenerator | null = null;
let staticTextureGenerator: TextureGenerator | null = null;

export function initTextureCaches(textureSize: number) {
  if (idleAnimationTextureGenerator) {
    // If we have one, we have them all.
    return;
  }

  const idleAnimationNumFrames = (idleAnimationLength * 60) / 1000;
  const uncachedIATG = idleAnimationTextureGeneratorFactory(
    textureSize,
    idleAnimationNumFrames
  );
  idleAnimationTextureGenerator = cacheTextureGenerator(
    uncachedIATG,
    textureSize,
    idleAnimationNumFrames
  );
  const uncachedSTG = staticTextureGeneratorFactory(textureSize);
  staticTextureGenerator = cacheTextureGenerator(
    uncachedSTG,
    textureSize,
    STATIC_TEXTURE.LAST_MARKER
  );
}
