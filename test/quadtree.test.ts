import { QuadTree } from "../src";

describe("quadtree", () => {
  it("constructor works with a 10,000x10,000 2d space", () => {
    const quadTree = new QuadTree({
      width: 10000,
      height: 10000,
      maxElements: 5, //Optional
      x: 0,
      y: 0
    });
    expect(quadTree).toBeTruthy();
  });

  it("detect a collision", () => {
    const quadTree = new QuadTree({
      width: 10000,
      height: 10000,
      maxElements: 5,
      x: 0,
      y: 0
    });

    const rect1 = {
      x: 10,
      y: 10,
      width: 100,
      height: 100
    };

    quadTree.push(rect1);

    const rect2 = {
      x: 55,
      y: 55,
      width: 100,
      height: 100
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([rect1]);
  });

  it("detects no collisions correctly", () => {
    const quadTree = new QuadTree({
      width: 10000,
      height: 10000,
      maxElements: 5, //Optional
      x: 0,
      y: 0
    });

    const rect1 = {
      x: 10,
      y: 10,
      width: 100,
      height: 100
    };

    quadTree.push(rect1);

    const rect2 = {
      x: 15,
      y: 100,
      width: 100,
      height: 100
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([rect1]);
  });

  it("detects collisions on border", () => {
    const quadTree = new QuadTree({
      width: 10000,
      height: 10000,
      maxElements: 5,
      x: 0,
      y: 0
    });

    const rect1 = {
      x: 10,
      y: 10,
      width: 100,
      height: 100
    };

    quadTree.push(rect1);

    const rect2 = {
      x: 20,
      y: 111,
      width: 100,
      height: 100
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([]);
  });

  it("detect another collision", () => {
    const quadTree = new QuadTree({
      width: 10000,
      height: 10000,
      maxElements: 5,
      x: 0,
      y: 0
    });

    const rect1 = {
      x: 10,
      y: 10,
      width: 5,
      height: 5
    };

    quadTree.push(rect1);

    const rect2 = {
      x: 14,
      y: 14,
      width: 5,
      height: 5
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([rect1]);
  });
});
