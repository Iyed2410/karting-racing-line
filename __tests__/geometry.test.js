const { distance } = require('../utils/geometry.js');

test('distance between two points', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 3, y: 4 };
  expect(distance(a, b)).toBeCloseTo(5);
});
