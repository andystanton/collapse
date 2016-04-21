# Collapse

Collapse DOM elements into WebGL representations of their pixels.

## Requirements

* Latest Chrome or Firefox
* Node >= 5

## Usage

1. `$ npm install`
2. `$ npm start`

An Express app is now running at [http://localhost:3000/](http://localhost:3000/) which contains an example page with breakable elements.

## Examples

* [Big Crunch](https://andystanton.github.io/collapse)
* [Windowed Gravity](https://andystanton.github.io/collapse/bits.html)

## Notes

* Although the example in this repository uses Express, Collapse does not depend on Node. I used npm and gulp to drive dependency management and build steps.
* Collapse does not work in Safari at the time of writing owing to html canvases being considered tainted when drawing any images to them, even those that just use data URLs. 