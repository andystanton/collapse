# Collapse

Collapse DOM elements into WebGL representations of their pixels.

A modern TypeScript library that transforms DOM elements into animated WebGL pixel fragments using Three.js.

## Features

- Modern TypeScript codebase with full type safety
- ES modules with Vite bundling
- Three.js powered WebGL rendering
- Multiple animation systems (gravity, big bang/crunch)
- Responsive design with Bootstrap 5
- Hot module reloading for development

## Requirements

- Node.js 16+
- Modern browser with WebGL support

## Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Type checking:**
   ```bash
   npm run typecheck
   ```

## Usage

### Development Server
Run `npm run dev` to start the Vite development server with hot reloading.

### Production Server
Run `npm start` to start the Express server serving static files.

## Examples

Visit these paths when running the development server:

* [Big Crunch Demo](http://localhost:3000/) - Main collapse demo
* [Windowed Gravity](http://localhost:3000/bits.html) - Click-to-collapse with gravity

## API

The library exports a `COLLAPSE` object with the following methods:

```typescript
import { COLLAPSE } from './src/collapse.ts';

// Configure the collapse system
await COLLAPSE.configure({
  loop: COLLAPSE.SYSTEM.BigBangBigCrunch,
  chunkSize: 4,
  oncomplete: () => console.log('Animation complete')
});

// Collapse a DOM element
const element = document.querySelector('.my-element');
const collapsed = await COLLAPSE.collapse(element);

// Apply physics
COLLAPSE.KICK.AwayFromElement(collapsed);

// Reset all collapsed elements
COLLAPSE.reset();
```

### Animation Systems

- `COLLAPSE.SYSTEM.BigBangBigCrunch` - Elements explode then return to original position
- `COLLAPSE.SYSTEM.WindowGravity` - Bouncing physics with window boundaries
- `COLLAPSE.SYSTEM.NoGravity` - Elements float away

### Kick Systems

- `COLLAPSE.KICK.UpAndOut` - Random upward motion
- `COLLAPSE.KICK.AwayFromElement` - Fragments move away from element center

## Architecture

- **TypeScript** for type safety and better development experience
- **Vite** for modern bundling and development
- **Three.js** for WebGL rendering
- **ES Modules** for clean imports/exports
- **Express** for serving static files in production

## License

MIT 
