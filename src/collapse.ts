import * as THREE from 'three';

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
  pixels: Uint8ClampedArray;
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

let materials: Record<string, THREE.MeshBasicMaterial> = {};
let geometries: Record<string, THREE.ShapeGeometry> = {};
let elements: CollapseElement[] = [];
let lastUpdate: Date | undefined;
let startUpdate: Date | undefined;

class Fragment {
  private _mesh: THREE.Mesh;
  private _startPosition: THREE.Vector2;
  private _position: THREE.Vector2;
  private _direction: THREE.Vector2;
  private _dimensions: THREE.Vector2;

  constructor(mesh: THREE.Mesh, position: THREE.Vector2, direction: THREE.Vector2, dimensions: THREE.Vector2) {
    this._mesh = mesh;
    this._startPosition = new THREE.Vector2(position.x, position.y);
    this._position = position;
    this._direction = direction;
    this._dimensions = dimensions;
  }

  get mesh(): THREE.Mesh { return this._mesh; }
  set mesh(mesh: THREE.Mesh) { this._mesh = mesh; }

  get position(): THREE.Vector2 { return this._position; }
  set position(position: THREE.Vector2) { this._position = position; }

  get direction(): THREE.Vector2 { return this._direction; }
  set direction(direction: THREE.Vector2) { this._direction = direction; }

  get dimensions(): THREE.Vector2 { return this._dimensions; }
  set dimensions(dimensions: THREE.Vector2) { this._dimensions = dimensions; }

  get meshId(): number { return this._mesh.id; }
  get startPosition(): THREE.Vector2 { return this._startPosition; }
}

class CollapseElement {
  private _element: HTMLElement;
  private _fragments: Record<number, Fragment>;
  private _position: THREE.Vector2;
  private _dimensions: THREE.Vector2;

  constructor(element: HTMLElement, position: THREE.Vector2, dimensions: THREE.Vector2, fragments: Record<number, Fragment>) {
    this._element = element;
    this._fragments = fragments;
    this._position = position;
    this._dimensions = dimensions;
  }

  get element(): HTMLElement { return this._element; }
  set element(element: HTMLElement) { this._element = element; }

  get fragments(): Record<number, Fragment> { return this._fragments; }
  set fragments(fragments: Record<number, Fragment>) { this._fragments = fragments; }

  get position(): THREE.Vector2 { return this._position; }
  set position(position: THREE.Vector2) { this._position = position; }

  get dimensions(): THREE.Vector2 { return this._dimensions; }
  set dimensions(dimensions: THREE.Vector2) { this._dimensions = dimensions; }
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
    if (Object.keys(element.fragments).length === 0 && elements.includes(element)) {
      element.element.classList.remove('collapse-hidden');
      // Force repaint to fix textarea rendering bug
      if (element.element instanceof HTMLElement) {
        element.element.focus();
        element.element.blur();
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
    const fragmentIds = Object.keys(element.fragments);
    for (let i = 0; i < fragmentIds.length; ++i) {
      const obj = element.fragments[parseInt(fragmentIds[i])];
      obj.direction.y = (Math.random() * 30) + 1;
      obj.direction.x = (Math.random() * 50) - 25;
    }
  },

  AwayFromElement: (element: CollapseElement) => {
    const absoluteCentre = element.position.clone();
    absoluteCentre.x += element.dimensions.x / 2;
    absoluteCentre.y -= element.dimensions.y / 2;

    const fragmentIds = Object.keys(element.fragments);
    for (let i = 0; i < fragmentIds.length; ++i) {
      const obj = element.fragments[parseInt(fragmentIds[i])];
      const diff = new THREE.Vector2(absoluteCentre.x, absoluteCentre.y);
      diff.sub(obj.position);
      diff.addScaledVector(obj.dimensions, 0.5);

      obj.direction.y += diff.y * ((Math.random() * 2) - 1);
      obj.direction.x += diff.x * ((Math.random() * 2) - 1);
    }
  }
};

let configuration: CollapseConfiguration | undefined;

const reset = (): void => {
  for (const element of elements) {
    const domElement = element.element;
    const fragments = element.fragments;

    for (const fragmentId of Object.keys(fragments)) {
      scene.remove(fragments[parseInt(fragmentId)].mesh);
    }
    domElement.classList.remove('collapse-hidden');
  }
  elements = [];
  materials = {};
  geometries = {};
};

const configure = (config: CollapseConfiguration): Promise<void> => {
  configuration = config;
  configuration.chunkSize = config.chunkSize ?? 4;

  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({ alpha: true });
  camera = new THREE.OrthographicCamera(0, window.innerWidth, window.innerHeight, 0, 1, 1000);

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
    const dataUrl = await elementToDataUrl(element);
    const imageWrapper = await dataToImage(dataUrl, element);
    const collapsed = imageToMesh(imageWrapper);
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
          for (const meshId of Object.keys(element.fragments)) {
            const obj = element.fragments[parseInt(meshId)];
            const mesh = obj.mesh;

            objLoop(obj);

            mesh.position.x = obj.position.x;
            mesh.position.y = obj.position.y;
          }
        }, tbd);

        tbd.forEach(meshId => {
          delete element.fragments[meshId];
          const objectToRemove = scene.getObjectById(meshId);
          if (objectToRemove) {
            scene.remove(objectToRemove);
          }
        });
      });
    }

    lastUpdate = thisUpdate;
  }

  renderer.render(scene, camera);
};

const getRectangleGeometry = (w: number, h: number): THREE.ShapeGeometry => {
  const geomName = `${w}x${h}`;
  if (!geometries[geomName]) {
    const rectShape = new THREE.Shape();
    rectShape.moveTo(0, 0);
    rectShape.lineTo(0, h);
    rectShape.lineTo(w, h);
    rectShape.lineTo(w, 0);
    rectShape.lineTo(0, 0);

    const geometry = new THREE.ShapeGeometry(rectShape);

    // Assign UVs
    geometry.computeBoundingBox();
    const max = geometry.boundingBox!.max;
    const min = geometry.boundingBox!.min;

    const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
    const range = new THREE.Vector2(max.x - min.x, max.y - min.y);

    const uvs: THREE.Vector2[] = [];
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      uvs.push(new THREE.Vector2((x + offset.x) / range.x, (y + offset.y) / range.y));
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs.flatMap(uv => [uv.x, uv.y]), 2));

    geometries[geomName] = geometry;
  }
  return geometries[geomName];
};

const getMaterial = (r: number, g: number, b: number, a: number): THREE.MeshBasicMaterial => {
  const rgbaName = `${r},${g},${b},${a}`;
  if (!materials[rgbaName]) {
    const texture = new THREE.DataTexture(Uint8Array.of(r, g, b, a), 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    materials[rgbaName] = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: a > 0
    });
  }
  return materials[rgbaName];
};

const elementToDataUrl = async (element: HTMLElement): Promise<string> => {
  // Simple implementation - in a real app you might want to use html2canvas or similar
  const canvas = document.createElement('canvas');
  canvas.width = element.offsetWidth;
  canvas.height = element.offsetHeight;

  const ctx = canvas.getContext('2d')!;

  // Fill with element's background color or transparent
  const computedStyle = window.getComputedStyle(element);
  ctx.fillStyle = computedStyle.backgroundColor || 'transparent';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add element's text content (simplified)
  if (element.textContent) {
    ctx.fillStyle = computedStyle.color || '#000000';
    ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
    ctx.fillText(element.textContent, 10, 20);
  }

  canvas.remove();
  return canvas.toDataURL();
};

const dataToImage = (dataUrl: string, element: HTMLElement): Promise<ImageWrapper> => {
  return new Promise(resolve => {
    const getPosition = (el: HTMLElement) => ({
      left: el.getBoundingClientRect().left,
      right: el.getBoundingClientRect().right,
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
    });

    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = dataUrl;

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = element.offsetWidth;
      canvas.height = element.offsetHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);

      canvas.remove();
      resolve({
        pixels: ctx.getImageData(0, 0, element.offsetWidth, element.offsetHeight).data,
        width: element.offsetWidth,
        height: element.offsetHeight,
        position: getPosition(element),
        element: element,
      });
    };
  });
};

const imageToMesh = (imageWrapper: ImageWrapper): CollapseElement => {
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

  const chunkGeometry = getRectangleGeometry(chunkSize, chunkSize);
  const fragments: Record<number, Fragment> = {};

  let left = imageWrapper.width;
  let right = 0;

  for (let y = 0; y < imageWrapper.height; y += chunkSize) {
    for (let x = 0; x < imageWrapper.width; x += chunkSize) {
      const meshOffset = (x * 4) + (y * imageWrapper.width * 4);
      let material: THREE.MeshBasicMaterial | undefined;

      if (chunkSize === 1) {
        const alpha = imageWrapper.pixels[meshOffset + 3];
        if (alpha > 0) {
          material = getMaterial(
            imageWrapper.pixels[meshOffset],
            imageWrapper.pixels[meshOffset + 1],
            imageWrapper.pixels[meshOffset + 2],
            imageWrapper.pixels[meshOffset + 3]
          );
        }
      } else {
        let transparentCount = 0;
        let invisibleCount = 0;
        const pixels: number[] = [];

        for (let innerY = chunkSize; innerY >= 0; --innerY) {
          if (y + innerY < imageWrapper.height) {
            for (let innerX = 0; innerX < chunkSize; ++innerX) {
              const pixelOffset = meshOffset + (innerX * 4) + (innerY * imageWrapper.width * 4);

              if (x + innerX < imageWrapper.width) {
                const alpha = imageWrapper.pixels[pixelOffset + 3];
                if (alpha < 255) {
                  transparentCount++;
                  if (alpha === 0) {
                    invisibleCount++;
                  }
                }
                pixels.push(
                  imageWrapper.pixels[pixelOffset],
                  imageWrapper.pixels[pixelOffset + 1],
                  imageWrapper.pixels[pixelOffset + 2],
                  imageWrapper.pixels[pixelOffset + 3]
                );
              } else {
                pixels.push(0, 0, 0, 0);
                transparentCount++;
                invisibleCount++;
              }
            }
          } else {
            for (let ix = 0; ix < chunkSize; ++ix) {
              pixels.push(0, 0, 0, 0);
              transparentCount++;
              invisibleCount++;
            }
          }
        }

        if (invisibleCount < (chunkSize * chunkSize)) {
          if (x < left) left = x;
          if (x > right) right = x;

          const texture = new THREE.DataTexture(
            Uint8Array.from(pixels),
            chunkSize,
            chunkSize,
            THREE.RGBAFormat
          );
          texture.needsUpdate = true;
          material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: transparentCount > 0
          });
        }
      }

      if (material) {
        const mesh = new THREE.Mesh(chunkGeometry, material);
        const fragment = new Fragment(
          mesh,
          new THREE.Vector2(
            imageWrapper.position.left + x,
            window.innerHeight - imageWrapper.position.top - y - chunkSize
          ),
          new THREE.Vector2(0, 0),
          new THREE.Vector2(chunkSize, chunkSize)
        );
        fragments[fragment.meshId] = fragment;
        scene.add(mesh);
      }
    }
  }

  return new CollapseElement(
    imageWrapper.element,
    new THREE.Vector2(imageWrapper.position.left + left, window.innerHeight - imageWrapper.position.top - imageWrapper.height),
    new THREE.Vector2(right - left, imageWrapper.height),
    fragments
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