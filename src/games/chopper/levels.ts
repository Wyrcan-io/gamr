/**
 * Hyper Chopper - Level Definitions
 *
 * Each level has:
 * - name: Display name
 * - platforms: Array of {x, y, width} - huts spawn centered on each
 * - waterLevel: Y position where water starts (death zone)
 * - timeLimit: Seconds to complete all deliveries
 * - parTime: Target time for 3 stars
 *
 * Map is ~70 chars wide, ~16 rows tall
 * Y=0 is top, Y increases downward
 * Platforms need headroom above for huts (3 rows tall)
 */

export interface Platform {
  x: number;
  y: number;
  width: number;
}

export interface Level {
  name: string;
  platforms: Platform[];
  waterLevel: number;
  timeLimit: number;
  parTime: number;
}

// Tutorial levels - progressive learning, no time pressure
export const TUTORIAL_LEVELS: Level[] = [
  // Tutorial 1: Flight School - just learn to fly and steer
  {
    name: 'FLIGHT SCHOOL',
    waterLevel: 17, // Very low water for safety
    platforms: [
      { x: 5, y: 14, width: 20 },   // Left platform (start here)
      { x: 45, y: 14, width: 20 },  // Right platform (fly to here)
    ],
    timeLimit: 300,
    parTime: 60,
  },
  // Tutorial 2: First Delivery - learn pickup and dropoff
  {
    name: 'FIRST DELIVERY',
    waterLevel: 17,
    platforms: [
      { x: 5, y: 14, width: 20 },   // Left platform
      { x: 45, y: 14, width: 20 },  // Right platform (same height)
    ],
    timeLimit: 300,
    parTime: 60,
  },
  // Tutorial 3: Rope Master - platforms at different heights
  {
    name: 'ROPE MASTER',
    waterLevel: 17,
    platforms: [
      { x: 5, y: 14, width: 18 },   // Low left (near water)
      { x: 45, y: 6, width: 18 },   // High right (need to raise rope!)
    ],
    timeLimit: 300,
    parTime: 60,
  },
];

export const LEVELS: Level[] = [
  // Level 1 - Easy intro
  {
    name: 'STONE AGE TAXI',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 14, width: 18 },  // Left cliff
      { x: 52, y: 14, width: 18 }, // Right cliff
      { x: 26, y: 8, width: 16 },  // Center high
    ],
    timeLimit: 60,
    parTime: 30,
  },

  // Level 2 - Wider gaps
  {
    name: 'CANYON RUN',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 14, width: 16 },  // Bottom left
      { x: 54, y: 14, width: 16 }, // Bottom right
      { x: 26, y: 9, width: 18 },  // Center mid
    ],
    timeLimit: 75,
    parTime: 40,
  },

  // Level 3 - High center peak
  {
    name: 'TRIPLE PEAK',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 12, width: 14 },   // Left peak
      { x: 28, y: 6, width: 14 },   // Center peak (highest)
      { x: 56, y: 12, width: 14 },  // Right peak
    ],
    timeLimit: 80,
    parTime: 45,
  },

  // Level 4 - Ascending platforms
  {
    name: 'THE STAIRS',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 14, width: 18 },   // Ground floor
      { x: 26, y: 10, width: 16 },  // Mid level
      { x: 52, y: 6, width: 18 },   // Top level
    ],
    timeLimit: 85,
    parTime: 50,
  },

  // Level 5 - All same height, small islands
  {
    name: 'ISLAND HOP',
    waterLevel: 15,
    platforms: [
      { x: 5, y: 13, width: 12 },   // Left island
      { x: 29, y: 13, width: 12 },  // Center island
      { x: 53, y: 13, width: 12 },  // Right island
    ],
    timeLimit: 70,
    parTime: 40,
  },

  // Level 6 - Very high center tower
  {
    name: 'THE TOWER',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 14, width: 20 },   // Ground left
      { x: 28, y: 5, width: 14 },   // Tower top (very high!)
      { x: 50, y: 14, width: 20 },  // Ground right
    ],
    timeLimit: 90,
    parTime: 55,
  },

  // Level 7 - Alternating heights
  {
    name: 'ZIGZAG',
    waterLevel: 16,
    platforms: [
      { x: 0, y: 12, width: 16 },   // High left
      { x: 27, y: 14, width: 16 },  // Low center
      { x: 54, y: 8, width: 16 },   // Higher right
    ],
    timeLimit: 85,
    parTime: 50,
  },

  // Level 8 - Final challenge, platforms near water
  {
    name: 'FINAL FLIGHT',
    waterLevel: 15,
    platforms: [
      { x: 2, y: 13, width: 14 },   // Left (near water!)
      { x: 28, y: 7, width: 14 },   // High center
      { x: 54, y: 13, width: 14 },  // Right (near water!)
    ],
    timeLimit: 100,
    parTime: 60,
  },
];
