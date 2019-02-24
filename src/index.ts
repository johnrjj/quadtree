interface ElementRect {
  // x, y are bottom left, width and height are additive.
  x: number;
  y: number;
  width?: number;
  height?: number;
  [extras: string]: any;
}

interface QuadTreeUserOptions {
  width: number;
  height: number;
  x?: number;
  y?: number;
  maxElements?: number;
}

interface LazyQuadTree {
  create: () => QuadTree;
  tree: QuadTree | null;
}

class QuadTree implements ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
  private maxElements: number;
  private contents: Array<ElementRect>;
  private oversized: Array<ElementRect>;
  private size: number;
  private children: {
    NW: LazyQuadTree;
    NE: LazyQuadTree;
    SW: LazyQuadTree;
    SE: LazyQuadTree;
  };

  // The quadtree constructor accepts a single parameter object containing the following properties :
  // - width / length : dimensions of the quadtree. [ *mandatory* ]
  // - maxElements : the maximum number of elements before the leaf 'splits' into subtrees. [ *defaults to 1* ]
  // - x / y : these coordinates are used internally by the library to position subtrees.
  constructor({ x, y, width, height, maxElements }: QuadTreeUserOptions) {
    this.width = width;
    this.height = height;
    if (this.width == null || this.height == null) {
      throw new Error("Missing quadtree dimensions.");
    }
    this.x = x || 0;
    this.y = y || 0;
    this.maxElements = maxElements || 1;
    this.contents = [];
    this.oversized = [];
    this.size = 0;
    // Dimension & coordinates are checked, an error is thrown in case of bad input.
    if (this.width < 1 || this.height < 1) {
      throw new Error("Dimensions must be positive integers.");
    }
    if (!Number.isInteger(this.x) || !Number.isInteger(this.y)) {
      throw new Error("Coordinates must be integers");
    }
    if (this.maxElements < 1) {
      throw new Error(
        "The maximum number of elements before a split must be a positive integer."
      );
    }
    const that = this;
    // The subtrees list, by position.
    this.children = {
      // Northwest tree.
      NW: {
        create() {
          return new QuadTree({
            x: that.x,
            y: that.y,
            width: Math.max(Math.floor(that.width / 2), 1),
            height: Math.max(Math.floor(that.height / 2), 1),
            maxElements: that.maxElements
          });
        },
        tree: null
      },
      // Northeast tree.
      NE: {
        create() {
          return new QuadTree({
            x: that.x + Math.max(Math.floor(that.width / 2), 1),
            y: that.y,
            width: Math.ceil(that.width / 2),
            height: Math.max(Math.floor(that.height / 2), 1),
            maxElements: that.maxElements
          });
        },
        tree: null
      },
      // Southwest tree.
      SW: {
        create() {
          return new QuadTree({
            x: that.x,
            y: that.y + Math.max(Math.floor(that.height / 2), 1),
            width: Math.max(Math.floor(that.width / 2), 1),
            height: Math.ceil(that.height / 2),
            maxElements: that.maxElements
          });
        },
        tree: null
      },
      // Southeast tree.
      SE: {
        create() {
          return new QuadTree({
            x: that.x + Math.max(Math.floor(that.width / 2), 1),
            y: that.y + Math.max(Math.floor(that.height / 2), 1),
            width: Math.ceil(that.width / 2),
            height: Math.ceil(that.height / 2),
            maxElements: that.maxElements
          });
        },
        tree: null
      }
    };
    // Adding a getter which lazily creates the tree.
    for (let child in this.children) {
      (this.children[child] as any).get = function() {
        if (this.tree != null) {
          return this.tree;
        } else {
          this.tree = this.create();
          return this.tree;
        }
      };
    }
  }

  // Removes all elements from the quadtree and restores it to pristine state.
  public clear() {
    this.contents = [];
    this.oversized = [];
    this.size = 0;
    return (() => {
      const result: Array<any> = [];
      for (let child in this.children) {
        result.push((this.children[child].tree = null));
      }
      return result;
    })();
  }

  // Add an element to the quadtree.
  // Elements can be observed to reorganize them into the quadtree automatically whenever their coordinates or dimensions are set (for ex. obj.x = ...).
  public push(item: ElementRect, doObserve: boolean = false): this {
    return this.pushAll([item], doObserve);
  }

  // Push an array of elements.
  public pushAll(items: Array<ElementRect>, doObserve: boolean = false): this {
    for (let item of Array.from(items)) {
      validateElement(item);
      if (doObserve) {
        observe(item, this);
      }
    }

    const fifo = [{ tree: this, elements: items }];

    while (fifo.length > 0) {
      var direction;
      const { tree, elements } = fifo.shift() as {
        tree: QuadTree;
        elements: Array<ElementRect>;
      };

      const fifoCandidates = { NW: null, NE: null, SW: null, SE: null };

      for (let element of Array.from(elements)) {
        tree.size++;

        const fits = fitting(element, tree);

        if (fits.length !== 1 || tree.width === 1 || tree.height === 1) {
          tree.oversized.push(element);
        } else if (tree.size - tree.oversized.length <= tree.maxElements) {
          tree.contents.push(element);
        } else {
          direction = fits[0];
          const relatedChild = tree.children[direction];
          if (fifoCandidates[direction] == null) {
            fifoCandidates[direction] = {
              tree: relatedChild.get(),
              elements: []
            };
          }
          fifoCandidates[direction].elements.push(element);

          for (let content of Array.from(tree.contents)) {
            const contentDir = fitting(content, tree)[0];
            if (fifoCandidates[contentDir] == null) {
              fifoCandidates[contentDir] = {
                tree: tree.children[contentDir].get(),
                elements: []
              };
            }
            fifoCandidates[contentDir].elements.push(content);
          }

          tree.contents = [];
        }
      }

      for (direction in fifoCandidates) {
        const candidate = fifoCandidates[direction];
        if (candidate != null) {
          fifo.push(candidate);
        }
      }
    }

    return this;
  }

  // Removes an element from the quadtree.
  public remove(item: ElementRect, stillObserve: boolean): boolean {
    validateElement(item);

    let index = this.oversized.indexOf(item);
    if (index > -1) {
      this.oversized.splice(index, 1);
      this.size--;
      if (!stillObserve) {
        unobserve(item);
      }
      return true;
    }

    index = this.contents.indexOf(item);
    if (index > -1) {
      this.contents.splice(index, 1);
      this.size--;
      if (!stillObserve) {
        unobserve(item);
      }
      return true;
    }

    const relatedChild = this.children[calculateDirection(item, this)];

    if (
      relatedChild.tree != null &&
      relatedChild.tree.remove(item, stillObserve)
    ) {
      this.size--;
      if (relatedChild.tree.size === 0) {
        relatedChild.tree = null;
      }
      return true;
    }

    return false;
  }

  // Returns an array of elements which collides with the `item` argument.
  // `item` being an object having x, y, width & height properties.

  // The default collision function is a basic bounding box algorithm.
  // You can change it by providing a function as a second argument.
  //```javascript
  //colliding({x: 10, y: 20}, function(element1, element2) {
  //    return // Place predicate here //
  //})
  //```
  public colliding(
    item: ElementRect,
    collisionFunction = boundingBoxCollision
  ) {
    validateElement(item);
    const items: Array<ElementRect> = [];
    const fifo = [this];

    while (fifo.length > 0) {
      let elt: ElementRect;
      const top = fifo.shift() as QuadTree;

      for (elt of Array.from(top.oversized)) {
        if (elt !== item && collisionFunction(item, elt)) {
          items.push(elt);
        }
      }
      for (elt of Array.from(top.contents)) {
        if (elt !== item && collisionFunction(item, elt)) {
          items.push(elt);
        }
      }

      let fits = fitting(item, top);

      // Special case for elements located outside of the quadtree on the right / bottom side
      if (fits.length === 0) {
        fits = [];
        if (item.x >= top.x + top.width) {
          fits.push("NE");
        }
        if (item.y >= top.y + top.height) {
          fits.push("SW");
        }
        if (fits.length > 0) {
          if (fits.length === 1) {
            fits.push("SE");
          } else {
            fits = ["SE"];
          }
        }
      }

      for (let child of Array.from(fits)) {
        if (top.children[child].tree != null) {
          fifo.push(top.children[child].tree);
        }
      }
    }

    return items;
  }

  // Performs an action on elements which collides with the `item` argument.
  // `item` being an object having x, y, width & height properties.

  // The default collision function is a basic bounding box algorithm.
  // You can change it by providing a function as a third argument.
  //```javascript
  //onCollision(
  //    {x: 10, y: 20},
  //    function(item) { /* stuff */ },
  //    function(element1, element2) {
  //        return // Place predicate here //
  //})
  //```
  public onCollision(
    item: ElementRect,
    callback: (el: ElementRect) => unknown,
    collisionFunction = boundingBoxCollision
  ) {
    validateElement(item);

    const fifo: Array<QuadTree> = [this];
    while (fifo.length > 0) {
      let elt: ElementRect;
      const top = fifo.shift() as QuadTree;

      for (elt of Array.from(top.oversized)) {
        if (elt !== item && collisionFunction(item, elt)) {
          callback(elt);
        }
      }
      for (elt of Array.from(top.contents)) {
        if (elt !== item && collisionFunction(item, elt)) {
          callback(elt);
        }
      }

      let fits = fitting(item, top);

      // Special case for elements located outside of the quadtree on the right / bottom side
      if (fits.length === 0) {
        fits = [];
        if (item.x >= top.x + top.width) {
          fits.push("NE");
        }
        if (item.y >= top.y + top.height) {
          fits.push("SW");
        }
        if (fits.length > 0) {
          if (fits.length === 1) {
            fits.push("SE");
          } else {
            fits = ["SE"];
          }
        }
      }

      for (let child of Array.from(fits)) {
        if (top.children[child].tree != null) {
          fifo.push(top.children[child].tree);
        }
      }
    }

    return null;
  }

  // Alias of `where`.
  get(query: ElementRect) {
    return this.where(query);
  }
  // Returns an array of elements that match the `query` argument.
  where(query: ElementRect) {
    // Naïve parsing (missing coordinates)
    if (typeof query === "object" && (query.x == null || query.y == null)) {
      return this.find(function(elt) {
        let check = true;
        for (let key in query) {
          if (query[key] !== elt[key]) {
            check = false;
          }
        }
        return check;
      });
    }

    // Optimised parsing
    validateElement(query);
    const items: Array<ElementRect> = [];
    const fifo: Array<QuadTree> = [this];

    while (fifo.length > 0) {
      let check: boolean, elt: ElementRect, key: string | number;
      const top = fifo.shift() as QuadTree;

      for (elt of Array.from(top.oversized)) {
        check = true;
        for (key in query) {
          if (query[key] !== elt[key]) {
            check = false;
          }
        }
        if (check) {
          items.push(elt);
        }
      }
      for (elt of Array.from(top.contents)) {
        check = true;
        for (key in query) {
          if (query[key] !== elt[key]) {
            check = false;
          }
        }
        if (check) {
          items.push(elt);
        }
      }

      const relatedChild = top.children[calculateDirection(query, top)];

      if (relatedChild.tree != null) {
        fifo.push(relatedChild.tree);
      }
    }

    return items;
  }

  // For each element of the quadtree, performs the `action` function.
  //```javascript
  //quad.each(function(item) { console.log(item) })
  //```
  each(action: (i: ElementRect) => unknown) {
    const fifo = [this];

    while (fifo.length > 0) {
      var i;
      const top = fifo.shift() as QuadTree;
      for (i of Array.from(top.oversized)) {
        if (typeof action === "function") {
          action(i);
        }
      }
      for (i of Array.from(top.contents)) {
        if (typeof action === "function") {
          action(i);
        }
      }

      for (let child in top.children) {
        if (top.children[child].tree != null) {
          fifo.push(top.children[child].tree);
        }
      }
    }
    return this;
  }

  // Returns an array of elements which validates the predicate.
  find(predicate: (i: ElementRect) => boolean) {
    const fifo = [this];
    const items: Array<any> = [];

    while (fifo.length > 0) {
      let i: ElementRect;
      const top = fifo.shift() as QuadTree;
      for (i of Array.from(top.oversized)) {
        if (typeof predicate === "function" ? predicate(i) : undefined) {
          items.push(i);
        }
      }
      for (i of Array.from(top.contents)) {
        if (typeof predicate === "function" ? predicate(i) : undefined) {
          items.push(i);
        }
      }

      for (let child in top.children) {
        if (top.children[child].tree != null) {
          fifo.push(top.children[child].tree);
        }
      }
    }
    return items;
  }

  // Returns a **cloned** `Quadtree` object which contains only the elements that validate the predicate.
  filter(predicate: Function) {
    const deepclone = target => {
      let item;
      const copycat = new QuadTree({
        x: target.x,
        y: target.y,
        width: target.width,
        height: target.height,
        maxElements: target.maxElements
      });
      copycat.size = 0;
      for (let child in target.children) {
        if (target.children[child].tree != null) {
          copycat.children[child].tree = deepclone(target.children[child].tree);
          copycat.size +=
            (copycat.children[child].tree != null
              ? copycat.children[child].tree.size
              : undefined) != null
              ? copycat.children[child].tree != null
                ? copycat.children[child].tree.size
                : undefined
              : 0;
        }
      }

      for (item of Array.from(target.oversized)) {
        if (
          predicate == null ||
          (typeof predicate === "function" ? predicate(item) : undefined)
        ) {
          copycat.oversized.push(item);
        }
      }
      for (item of Array.from(target.contents)) {
        if (
          predicate == null ||
          (typeof predicate === "function" ? predicate(item) : undefined)
        ) {
          copycat.contents.push(item);
        }
      }

      copycat.size += copycat.oversized.length + copycat.contents.length;
      if (copycat.size === 0) {
        return null;
      } else {
        return copycat;
      }
    };

    return deepclone(this);
  }

  // Opposite of filter.
  reject(predicate: (i: ElementRect) => boolean) {
    return this.filter(
      (i: ElementRect) =>
        !(typeof predicate === "function" ? predicate(i) : undefined)
    );
  }

  // Visits each tree & subtree contained in the `Quadtree` object.
  // For each node, performs the `action` function, inside which `this` is bound to the node tree object.
  visit(action: Function) {
    const fifo = [this];
    while (fifo.length > 0) {
      const that = fifo.shift() as QuadTree;
      action.bind(that)();
      for (let child in that.children) {
        if (that.children[child].tree != null) {
          fifo.push(that.children[child].tree);
        }
      }
    }
    return this;
  }

  // Pretty printing function.
  pretty() {
    let str = "";
    const indent = function(level) {
      let res = "";
      for (
        let times = level, asc = level <= 0;
        asc ? times < 0 : times > 0;
        asc ? times++ : times--
      ) {
        res += "   ";
      }
      return res;
    };

    const fifo = [{ label: "ROOT", tree: this, level: 0 }];
    while (fifo.length > 0) {
      const top = fifo.shift() as any;
      const indentation = indent(top.level);
      str += `\
${indentation}| ${top.label}
${indentation}| ------------\n\
`;

      if (top.tree.oversized.length > 0) {
        str += `\
${indentation}| * Oversized elements *
${indentation}|   ${top.tree.oversized}\n\
`;
      }

      if (top.tree.contents.length > 0) {
        str += `\
${indentation}| * Leaf content *
${indentation}|   ${top.tree.contents}\n\
`;
      }

      let isParent = false;
      for (let child in top.tree.children) {
        if (top.tree.children[child].tree != null) {
          isParent = true;
          fifo.unshift({
            label: child,
            tree: top.tree.children[child].tree,
            level: top.level + 1
          });
        }
      }

      if (isParent) {
        str += `${indentation}└──┐\n`;
      }
    }

    return str;
  }
}

// Add getters and setters for coordinates and dimensions properties in order to automatically reorganize the elements on change.
const observe = (item: ElementRect, tree: QuadTree) => {
  const writeAccessors = function(propName) {
    item[`_${propName}`] = item[propName];
    return Object.defineProperty(item, propName, {
      set(val) {
        tree.remove(this, true);
        this[`_${propName}`] = val;
        return tree.push(this);
      },
      get() {
        return this[`_${propName}`];
      },
      configurable: true
    });
  };
  writeAccessors("x");
  writeAccessors("y");
  writeAccessors("width");
  return writeAccessors("height");
};

// Remove getters and setters and restore previous properties
const unobserve = (item: any) => {
  const unwriteAccessors = function(propName: string) {
    if (item[`_${propName}`] == null) {
      return;
    }
    delete item[propName];
    item[propName] = item[`_${propName}`];
    return delete item[`_${propName}`];
  };
  unwriteAccessors("x");
  unwriteAccessors("y");
  unwriteAccessors("width");
  return unwriteAccessors("height");
};

// Retrieves the center coordinates of a rectangle.
const getCenter = (item: ElementRect) => ({
  x: Math.floor((item.width != null ? item.width : 1) / 2) + item.x,
  y: Math.floor((item.height != null ? item.height : 1) / 2) + item.y
});

// Bounding box collision algorithm.
const boundingBoxCollision = (elt1: ElementRect, elt2: ElementRect) =>
  !(
    elt1.x >= elt2.x + (elt2.width != null ? elt2.width : 1) ||
    elt1.x + (elt1.width != null ? elt1.width : 1) <= elt2.x ||
    elt1.y >= elt2.y + (elt2.height != null ? elt2.height : 1) ||
    elt1.y + (elt1.height != null ? elt1.height : 1) <= elt2.y
  );

// Determines which subtree an element belongs to.
const calculateDirection = (element: ElementRect, tree: QuadTree) => {
  const quadCenter = getCenter(tree);

  if (element.x < quadCenter.x) {
    if (element.y < quadCenter.y) {
      return "NW";
    } else {
      return "SW";
    }
  } else {
    if (element.y < quadCenter.y) {
      return "NE";
    } else {
      return "SE";
    }
  }
};
// Returns splitted coordinates and dimensions.
const splitTree = tree => {
  const leftWidth = Math.max(Math.floor(tree.width / 2), 1);
  const rightWidth = Math.ceil(tree.width / 2);
  const topHeight = Math.max(Math.floor(tree.height / 2), 1);
  const bottomHeight = Math.ceil(tree.height / 2);
  return {
    NW: {
      x: tree.x,
      y: tree.y,
      width: leftWidth,
      height: topHeight
    },
    NE: {
      x: tree.x + leftWidth,
      y: tree.y,
      width: rightWidth,
      height: topHeight
    },
    SW: {
      x: tree.x,
      y: tree.y + topHeight,
      width: leftWidth,
      height: bottomHeight
    },
    SE: {
      x: tree.x + leftWidth,
      y: tree.y + topHeight,
      width: rightWidth,
      height: bottomHeight
    }
  };
};

// Validates a potential element of the tree.
const validateElement = (element: ElementRect) => {
  if (!(typeof element === "object")) {
    throw new Error("Element must be an Object.");
  }
  if (element.x == null || element.y == null) {
    throw new Error("Coordinates properties are missing.");
  }
  if ((element.width || 0) < 0 || (element.height || 0) < 0) {
    throw new Error("Width and height must be positive integers.");
  }
};

// Determines wether an element fits into subtrees.
const fitting = (element: ElementRect, tree: QuadTree) => {
  const where: Array<string> = [];
  const object = splitTree(tree);
  for (let direction in object) {
    const coordinates = object[direction];
    if (boundingBoxCollision(element, coordinates)) {
      where.push(direction);
    }
  }
  return where;
};

export { QuadTree };
