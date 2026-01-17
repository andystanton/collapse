import * as THREE from 'three';
import html2canvas from 'html2canvas';

interface CollapseConfiguration {
  chunkSize?: number;
  forceChunkOverride?: boolean;
  loop?: LoopFunction;
  oncomplete?: () => void;
}

type LoopFunction = (
  sinceStart: number,
  delta: number,
  element: CollapseElement,
  allFragments: (callback: (fragment: Fragment) => void) => void,
  toBeDestroyed: number[]
) => void;

interface ImageWrapper {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  position: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  element: HTMLElement;
}

let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let camera: THREE.OrthographicCamera;
let animationFrameId: number;

let elements: CollapseElement[] = [];
let lastUpdate: Date | undefined;
let startUpdate: Date | undefined;

// Shared geometry for all chunks - a unit plane
let sharedGeometry: THREE.PlaneGeometry;

class Fragment {
  private _index: number;
  private _startPosition: THREE.Vector2;
  private _position: THREE.Vector2;
  private _direction: THREE.Vector2;
  private _dimensions: THREE.Vector2;

  constructor(index: number, position: THREE.Vector2, direction: THREE.Vector2, dimensions: THREE.Vector2) {
    this._index = index;
    this._startPosition = new THREE.Vector2(position.x, position.y);
    this._position = position;
    this._direction = direction;
    this._dimensions = dimensions;
  }

  get index(): number { return this._index; }
  get meshId(): number { return this._index; } // Compatibility

  get position(): THREE.Vector2 { return this._position; }
  set position(position: THREE.Vector2) { this._position = position; }

  get direction(): THREE.Vector2 { return this._direction; }
  set direction(direction: THREE.Vector2) { this._direction = direction; }

  get dimensions(): THREE.Vector2 { return this._dimensions; }
  set dimensions(dimensions: THREE.Vector2) { this._dimensions = dimensions; }

  get startPosition(): THREE.Vector2 { return this._startPosition; }
}

class CollapseElement {
  private _element: HTMLElement;
  private _fragments: Map<number, Fragment>;
  private _instancedMesh: THREE.InstancedMesh;
  private _position: THREE.Vector2;
  private _dimensions: THREE.Vector2;
  private _dummy: THREE.Object3D;

  constructor(
    element: HTMLElement,
    position: THREE.Vector2,
    dimensions: THREE.Vector2,
    fragments: Map<number, Fragment>,
    instancedMesh: THREE.InstancedMesh
  ) {
    this._element = element;
    this._fragments = fragments;
    this._instancedMesh = instancedMesh;
    this._position = position;
    this._dimensions = dimensions;
    this._dummy = new THREE.Object3D();
  }

  get element(): HTMLElement { return this._element; }
  get instancedMesh(): THREE.InstancedMesh { return this._instancedMesh; }

  get fragments(): Record<number, Fragment> {
    // Return as Record for compatibility
    const record: Record<number, Fragment> = {};
    this._fragments.forEach((frag, key) => {
      record[key] = frag;
    });
    return record;
  }

  get fragmentsMap(): Map<number, Fragment> { return this._fragments; }

  get position(): THREE.Vector2 { return this._position; }
  set position(position: THREE.Vector2) { this._position = position; }

  get dimensions(): THREE.Vector2 { return this._dimensions; }
  set dimensions(dimensions: THREE.Vector2) { this._dimensions = dimensions; }

  updateInstanceMatrix(fragment: Fragment): void {
    this._dummy.position.set(
      fragment.position.x + fragment.dimensions.x / 2,
      fragment.position.y + fragment.dimensions.y / 2,
      0
    );
    this._dummy.scale.set(fragment.dimensions.x, fragment.dimensions.y, 1);
    this._dummy.updateMatrix();
    this._instancedMesh.setMatrixAt(fragment.index, this._dummy.matrix);
    this._instancedMesh.instanceMatrix.needsUpdate = true;
  }

  hideInstance(index: number): void {
    this._dummy.scale.set(0, 0, 0);
    this._dummy.updateMatrix();
    this._instancedMesh.setMatrixAt(index, this._dummy.matrix);
    this._instancedMesh.instanceMatrix.needsUpdate = true;
  }

  removeFragment(index: number): void {
    this.hideInstance(index);
    this._fragments.delete(index);
  }
}

const SYSTEMS = {
  WindowGravity: (sinceStart: number, delta: number, element: CollapseElement, allFragments: (callback: (fragment: Fragment) => void) => void, tbd: number[]) => {
    allFragments(obj => {
      obj.position.x += obj.direction.x;
      obj.position.y += obj.direction.y;

      obj.direction.y -= 4;
      obj.direction.x *= 0.95;

      if (obj.position.y < 0) {
        obj.position.y = 0;
        obj.direction.x *= 0.9;

        if (Math.abs(obj.direction.y) < 15) {
          tbd.push(obj.meshId);
        } else {
          obj.direction.y = -obj.direction.y * 0.4;
        }
      }

      if (obj.position.x < 0) {
        obj.position.x = 0;
        obj.direction.x = -obj.direction.x;
      }

      if (obj.position.x >= window.innerWidth) {
        obj.position.x = window.innerWidth - 1;
        obj.direction.x = -obj.direction.x;
      }
    });
  },

  NoGravity: (sinceStart: number, delta: number, element: CollapseElement, allFragments: (callback: (fragment: Fragment) => void) => void, tbd: number[]) => {
    allFragments(obj => {
      obj.position.x += obj.direction.x;
      obj.position.y += obj.direction.y;

      if (obj.position.y < 0 || obj.position.y > window.innerHeight ||
          obj.position.x < 0 || obj.position.x > window.innerWidth) {
        tbd.push(obj.meshId);
      }
    });
  },

  BigBangBigCrunch: (sinceStart: number, delta: number, element: CollapseElement, allFragments: (callback: (fragment: Fragment) => void) => void, tbd: number[]) => {
    if (element.fragmentsMap.size === 0 && elements.includes(element)) {
      // Clean up the instancedMesh
      scene.remove(element.instancedMesh);
      element.instancedMesh.geometry.dispose();
      (element.instancedMesh.material as THREE.Material).dispose();

      element.element.classList.remove('collapse-hidden');
      // Force repaint to fix textarea rendering bug
      if (element.element instanceof HTMLElement) {
        const el = element.element;
        // Use setTimeout to ensure repaint happens in a new task after render completes
        setTimeout(() => {
          el.style.display = 'none';
          void el.offsetHeight; // Force reflow
          el.style.display = '';
          el.focus();
          el.blur();
        }, 0);
      }
      elements = elements.filter(el => el !== element);
      if (elements.length === 0) {
        lastUpdate = undefined;
        startUpdate = undefined;
        configuration?.oncomplete?.();
      }
    }

    allFragments(obj => {
      if (sinceStart < 4000) {
        obj.position.x += obj.direction.x;
        obj.position.y += obj.direction.y;
      } else {
        if (Math.abs(obj.position.x - obj.startPosition.x) < 2 && Math.abs(obj.position.y - obj.startPosition.y) < 2) {
          obj.position.x = obj.startPosition.x;
          obj.position.y = obj.startPosition.y;
          tbd.push(obj.meshId);
        } else {
          obj.position.x -= obj.direction.x / 2;
          obj.position.y -= obj.direction.y / 2;
        }
      }
    });
  },
};

const KICKS = {
  UpAndOut: (element: CollapseElement) => {
    element.fragmentsMap.forEach(obj => {
      obj.direction.y = (Math.random() * 30) + 1;
      obj.direction.x = (Math.random() * 50) - 25;
    });
  },

  AwayFromElement: (element: CollapseElement) => {
    const absoluteCentre = element.position.clone();
    absoluteCentre.x += element.dimensions.x / 2;
    absoluteCentre.y -= element.dimensions.y / 2;

    element.fragmentsMap.forEach(obj => {
      const diff = new THREE.Vector2(absoluteCentre.x, absoluteCentre.y);
      diff.sub(obj.position);
      diff.addScaledVector(obj.dimensions, 0.5);

      obj.direction.y += diff.y * ((Math.random() * 2) - 1);
      obj.direction.x += diff.x * ((Math.random() * 2) - 1);
    });
  }
};

let configuration: CollapseConfiguration | undefined;

const reset = (): void => {
  for (const element of elements) {
    scene.remove(element.instancedMesh);
    element.instancedMesh.geometry.dispose();
    (element.instancedMesh.material as THREE.Material).dispose();
    element.element.classList.remove('collapse-hidden');
  }
  elements = [];
};

const configure = (config: CollapseConfiguration): Promise<void> => {
  configuration = config;
  configuration.chunkSize = config.chunkSize ?? 4;

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ alpha: true });
  camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 1000);

  // Create shared unit plane geometry (1x1, will be scaled per instance)
  sharedGeometry = new THREE.PlaneGeometry(1, 1);

  scene.add(camera);
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.position.z = 5;

  window.addEventListener('resize', () => {
    camera.right = window.innerWidth;
    camera.top = window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  document.querySelector('body')?.appendChild(renderer.domElement);

  console.log("Starting Collapse loop");
  render();

  return Promise.resolve();
};

const collapse = async (element: HTMLElement): Promise<CollapseElement> => {
  if (element.offsetWidth * element.offsetHeight < 300000) {
    const imageWrapper = await elementToImage(element);
    const collapsed = imageToInstancedMesh(imageWrapper);
    element.classList.add('collapse-hidden');
    // Reset timestamps when first element is added to avoid skipping a frame
    if (elements.length === 0) {
      lastUpdate = new Date();
      startUpdate = new Date();
    }
    elements.push(collapsed);
    return collapsed;
  } else {
    throw new Error(`Element ${element.tagName} (${element.offsetWidth}x${element.offsetHeight}) is too large to collapse!`);
  }
};

const render = (): void => {
  animationFrameId = requestAnimationFrame(render);

  if (!lastUpdate || !startUpdate) {
    lastUpdate = new Date();
    startUpdate = new Date();
  } else {
    const thisUpdate = new Date();
    const delta = thisUpdate.getTime() - lastUpdate.getTime();
    const sinceStart = thisUpdate.getTime() - startUpdate.getTime();

    if (configuration?.loop) {
      elements.forEach(element => {
        const tbd: number[] = [];
        configuration!.loop!(sinceStart, delta, element, (objLoop) => {
          element.fragmentsMap.forEach(obj => {
            objLoop(obj);
            element.updateInstanceMatrix(obj);
          });
        }, tbd);

        tbd.forEach(index => {
          element.removeFragment(index);
        });
      });
    }

    lastUpdate = thisUpdate;
  }

  renderer.render(scene, camera);
};

// Custom shader material for instanced UV mapping
const createInstancedMaterial = (texture: THREE.Texture, chunkSize: number, imageWidth: number, imageHeight: number): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      chunkSize: { value: chunkSize },
      imageSize: { value: new THREE.Vector2(imageWidth, imageHeight) },
    },
    vertexShader: `
      attribute vec2 uvOffset;
      varying vec2 vUv;
      uniform float chunkSize;
      uniform vec2 imageSize;

      void main() {
        // Calculate UV based on chunk position
        vUv = uvOffset + uv * (chunkSize / imageSize);

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      varying vec2 vUv;

      void main() {
        vec4 texColor = texture2D(map, vUv);
        if (texColor.a < 0.01) discard;
        gl_FragColor = texColor;
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
  });
};

const elementToImage = async (element: HTMLElement): Promise<ImageWrapper> => {
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 1,
  });

  const getPosition = (el: HTMLElement) => ({
    left: el.getBoundingClientRect().left,
    right: el.getBoundingClientRect().right,
    top: el.getBoundingClientRect().top,
    bottom: el.getBoundingClientRect().bottom,
  });

  return {
    canvas,
    width: element.offsetWidth,
    height: element.offsetHeight,
    position: getPosition(element),
    element: element,
  };
};

const imageToInstancedMesh = (imageWrapper: ImageWrapper): CollapseElement => {
  let chunkSize = configuration?.chunkSize ?? 4;
  const forceChunkOverride = configuration?.forceChunkOverride;
  const elementArea = imageWrapper.width * imageWrapper.height;

  if (!forceChunkOverride) {
    if (elementArea > 160000) {
      chunkSize = 32;
    } else if (elementArea > 100000) {
      chunkSize = 16;
    } else if (elementArea > 20000) {
      chunkSize = 8;
    }
  }

  // Calculate number of chunks
  const chunksX = Math.ceil(imageWrapper.width / chunkSize);
  const chunksY = Math.ceil(imageWrapper.height / chunkSize);
  const totalChunks = chunksX * chunksY;

  // Create texture from canvas
  const texture = new THREE.CanvasTexture(imageWrapper.canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  // Create instanced material
  const material = createInstancedMaterial(texture, chunkSize, imageWrapper.width, imageWrapper.height);

  // Create instanced mesh
  const instancedMesh = new THREE.InstancedMesh(sharedGeometry, material, totalChunks);

  // Create UV offset attribute
  const uvOffsets = new Float32Array(totalChunks * 2);

  const fragments = new Map<number, Fragment>();
  const dummy = new THREE.Object3D();

  let index = 0;
  let left = imageWrapper.width;
  let right = 0;

  // Get pixel data for alpha checking
  const ctx = imageWrapper.canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, imageWrapper.width, imageWrapper.height);
  const pixels = imageData.data;

  for (let y = 0; y < imageWrapper.height; y += chunkSize) {
    for (let x = 0; x < imageWrapper.width; x += chunkSize) {
      // Check if chunk has any visible pixels
      let hasVisiblePixels = false;
      for (let innerY = 0; innerY < chunkSize && y + innerY < imageWrapper.height; innerY++) {
        for (let innerX = 0; innerX < chunkSize && x + innerX < imageWrapper.width; innerX++) {
          const pixelOffset = ((y + innerY) * imageWrapper.width + (x + innerX)) * 4;
          if (pixels[pixelOffset + 3] > 0) {
            hasVisiblePixels = true;
            break;
          }
        }
        if (hasVisiblePixels) break;
      }

      if (hasVisiblePixels) {
        if (x < left) left = x;
        if (x > right) right = x;

        const posX = imageWrapper.position.left + x;
        const posY = window.innerHeight - imageWrapper.position.top - y - chunkSize;

        // Set UV offset (normalized coordinates)
        uvOffsets[index * 2] = x / imageWrapper.width;
        uvOffsets[index * 2 + 1] = 1 - (y + chunkSize) / imageWrapper.height;

        // Set instance matrix
        dummy.position.set(posX + chunkSize / 2, posY + chunkSize / 2, 0);
        dummy.scale.set(chunkSize, chunkSize, 1);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(index, dummy.matrix);

        const fragment = new Fragment(
          index,
          new THREE.Vector2(posX, posY),
          new THREE.Vector2(0, 0),
          new THREE.Vector2(chunkSize, chunkSize)
        );
        fragments.set(index, fragment);
        index++;
      }
    }
  }

  // Resize arrays if we skipped some chunks (transparent ones)
  instancedMesh.count = index;

  // Add UV offsets as instance attribute
  const geometry = sharedGeometry.clone();
  geometry.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(uvOffsets.slice(0, index * 2), 2));
  instancedMesh.geometry = geometry;

  instancedMesh.instanceMatrix.needsUpdate = true;
  scene.add(instancedMesh);

  return new CollapseElement(
    imageWrapper.element,
    new THREE.Vector2(imageWrapper.position.left + left, window.innerHeight - imageWrapper.position.top - imageWrapper.height),
    new THREE.Vector2(right - left, imageWrapper.height),
    fragments,
    instancedMesh
  );
};

export const COLLAPSE = {
  reset,
  configure,
  collapse,
  SYSTEM: SYSTEMS,
  KICK: KICKS,
  Fragment,
  Element: CollapseElement
};

export default COLLAPSE;
