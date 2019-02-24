## Overview

A [quadtree](https://en.wikipedia.org/wiki/Quadtree) written in TypeScript.

A quadtree

## Motivation

I needed an extremely fast and space-efficient 2D collision system for my tooltip positioning system.

    ┌──────────────┬─────────────┬──────────────┐
    │              │             │      C       │
    │              │             │              │
    │  tooltip a   │  tooltip b  ├──────────────┤
    │              │             │              │
    │              │             │      D       │
    │              │             │              │
    └──────────────┴─────────────┴──────────────┘     ┌────────┐
                                                      │        │
     ┌──────────────────────────────────────────┐     │        │
     │               run of text                │     │        │
     └──────────────────────────────────────────┘     │tooltip │
                                                      │   h    │
                                                      │        │
     ┌───────┬───────┬────────────────┬ ─ ─ ─ ─ ┐     │        │
     │       │       │   Tooltip g    │               │        │
     │Tooltip│Tooltip│                │ (verify │     └────────┘
     │   e   │   f   ├────────────────┘ tooltip
     │       │       │                │position │
     │       │       │                  before
     └───────┴───────┘                │ placing │

                                      └ ─ ─ ─ ─ ┘

To place multiple tooltips so that they do not overlap, we need

- a data structure that allows expressing a 2D space
- an algorithm that is capable of finding potential collisions in a 2D search space efficiently and quickly.
- (not part of this package) a way to 'best guess' a tooltip position and resolve conflicts and correctly place a tooltip

In normal UX, when a tooltip is triggered, the tooltip needs to be positioned near instantly, so finding a valid position for a tooltip needs to be fast. What makes it tricky?

- Multiple tooltips on the page, in arbitrary places

Tooltips can show up in arbitrary places on a webpage, with arbitrary dimensions and contents. I needed a flexible system for placing, moving, and removing 2D objects.

- 4K resolutions imply a 4K \* 4K search space -- O(n^2) space complexity)
  As we need pixel-level granularity. Without proper architecture, the memory requirements become too large.

Being able to place tooltips in an x,y coordinate system, and quickly detect collisions for incoming and existing tooltips allows for performantly displaying multiple tooltips on a page.

Other alternatives considered were (Spatial hashing)[http://zufallsgenerator.github.io/2014/01/26/visually-comparing-algorithms/].

## Prior Art

Implementation and parts of README borrowed from (quadtree-lib)[https://github.com/elbywan/quadtree-lib], which I've updated and further customized.

## Usage

### Import

```javascript
import { QuadTree } from "quadtree";
```

### Initialize

First step is to initialize a new Quadtree object.

```javascript
const quadtree = new QuadTree({
  width: 500,
  height: 500,
  maxElements: 5 // Optional
});
```

`width` and `height` are mandatory attributes.

`maxElements` (default 1) is the maximum number of elements contained in a leaf before it
splits into child trees.

### Adding elements

Elements must be objects, with coordinates set.

Optionally, you can pass a boolean argument which, if set to `true`, will
remove/push the object into the quadtree each time its coordinates or dimensions
are set _(ex: item.x = ... or item.width = ...)_.

_Without this flag, x / y / width / height properties should_ **not** _be
changed after insertion._

```javascript
quadtree.push(
  {
    x: 10,
    y: 10,
    width: 1,
    height: 2
  },
  true
);
```

To insert an array of elements, use the **pushAll** method which is faster than inserting each element with push.

```javascript
quadtree.pushAll([
  { x: 1, y: 1, width: 5, height: 5 },
  { x: 2, y: 2, width: 10, heigh: 10 }
  // ... //
]);
```

### Removing elements

Removes an item by reference.

```javascript
quadtree.remove(item);
```

### Clearing the tree

Removes the tree contents and restores it to pristine state.

```javascript
quatree.clear();
```

### Filtering the tree

Filters the quadtree and returns a **clone** containing only the elements
determined by a predicate function.

```javascript
const filtered = quadtree.filter(element => element.x > 50);
)
```

_Opposite: quadtree.reject_

### Retrieve colliding elements

Gets every element that collides with the parameter 2d object.

```javascript
const colliding = quadtree.colliding({
  x: 10,
  y: 10,
  width: 5, //Optional
  height: 5 //Optional
});
```

The default collision function is a basic bounding box algorithm.
You can change it by providing a function as a second argument.

```javascript
const colliding = quadtree.colliding(
  {
    x: 10,
    y: 10
  },
  (element1, element2) => {
    return; // Place collision algorithm here //
  }
);
```

### Perform an action on colliding elements

Performs an action on every element that collides with the parameter 2d object.

```javascript
onCollision(
  {
    x: 10,
    y: 20
  },
  item => {}
);
```

### Retrieve by properties

Gets every element that match the parameter properties.

```javascript
quadtree.push({ x: 0, y: 0, foo: "bar" });
const match = quadtree.where({
  foo: "bar"
});
```

_Alias : quadtree.get_

### Retrieve by predicate

Gets every element that validate the given predicate.

```javascript
quadtree.find(element => element.color === 'red'});
```

### Iterate over the elements

Performs an action on each element of the Quadtree (breadth first traversal).

```javascript
quadtree.each(element => console.log(element.color));
```
