import { QuadTree } from "../src";

describe("quadtree", () => {
  it("constructor works with a 100,000x100,000 2d space", () => {
    const quadTree = new QuadTree({
      width: 100000,
      height: 100000,
      maxElements: 5,
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
      x: 50,
      y: 50,
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
      x: 111,
      y: 111,
      width: 100,
      height: 100
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([]);
  });

  it("does not detect a collision on the same pixel", () => {
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
      x: 110,
      y: 110,
      width: 100,
      height: 100
    };

    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([]);
  });

  it("detect another n-1 pixels", () => {
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
      x: 109,
      y: 109,
      width: 100,
      height: 100
    };
    const collidingElements = quadTree.colliding(rect2);

    expect(collidingElements).toEqual([rect1]);
  });
});
