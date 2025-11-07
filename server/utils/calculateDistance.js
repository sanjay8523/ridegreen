// ========== server/utils/calculateDistance.js ==========
// NOTE: This is a mocked function. In a production environment,
// you would integrate Google Maps Distance Matrix API or a similar service.

/**
 * Calculates a mocked distance and estimated duration between two points.
 * @param {object} origin {address, city, coordinates}
 * @param {object} destination {address, city, coordinates}
 * @returns {object} {distance: number (km), estimatedDuration: number (minutes)}
 */
const calculateDistance = (origin, destination) => {
  // Mock logic: Distance between 10km and 100km
  const distance = Math.floor(Math.random() * 91) + 10;

  // Mock logic: Assuming an average speed of 40 km/h
  const estimatedDuration = Math.ceil((distance / 40) * 60);

  return { distance, estimatedDuration };
};

module.exports = { calculateDistance };
