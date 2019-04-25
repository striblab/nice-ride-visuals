/**
 * Get directions for a set of unique trips
 */

// Dependencies
const Sequelize = require('sequelize');
const directions = require('./directions-api');
const debug = require('debug')('load-directions');
require('dotenv').load();

// Do main
main();

// Main
async function main() {
  try {
    const db = await setup();
    const points = await getPoints(db);
    const Directions = directionsModel(db);
    await db.sync({ force: true });
    await Directions.runManualIndexes(db);

    // Go through each item
    for (let set of points) {
      await loadPoints(set, Directions);
    }

    await db.close();
  }
  catch (e) {
    console.error(e);
  }
}

// Load set
async function loadPoints(points, Directions) {
  debug(points);

  // Easier ref
  let start = points.start_point.coordinates;
  let end = points.end_point.coordinates;

  // Check if same start and end
  let roundtrip = start[0] === end[0] && start[1] === end[1];

  // Handle roundtrip
  if (roundtrip) {
    return;
  }

  // Get directions
  let l = await directions([start, end]);
  let mainRoute = l.routes[0];

  // Make model object
  let d = new Directions({
    startPoint: addSrid(points.start_point),
    endPoint: addSrid(points.end_point),
    duration: mainRoute.duration,
    distance: mainRoute.distance,
    route: addSrid(mainRoute.geometry),
    altRouteA: l.routes[1] ? addSrid(l.routes[1].geometry) : undefined,
    altRouteB: l.routes[2] ? addSrid(l.routes[2].geometry) : undefined,
    response: l
  });

  await d.save();
  return d;
}

// Get list of unique point sets
async function getPoints(db, day = '2018-07-21') {
  let rows = await db.query(
    `
    SELECT start_point, end_point, COUNT(*) AS count, AVG(duration) AS avg_duration
    FROM trips
    WHERE DATE(start_time) = '${day}'
    GROUP BY start_point, end_point
    LIMIT 1000;
    `,
    { type: db.QueryTypes.SELECT }
  );

  return rows;
}

// Setup
async function setup() {
  let db = new Sequelize(process.env.TABLES_DB_URI);
  await db.authenticate();
  return db;
}

// Model
function directionsModel(db) {
  class Directions extends Sequelize.Model {}
  Directions.init(
    {
      startPoint: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        primaryKey: true
      },
      endPoint: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        primaryKey: true
      },
      midPoint: {
        type: Sequelize.GEOMETRY('POINT', 4326),
        allowNull: true
      },
      duration: {
        type: Sequelize.FLOAT
      },
      distance: {
        type: Sequelize.FLOAT
      },
      route: {
        type: Sequelize.GEOMETRY('LINESTRING', 4326)
      },
      altRouteA: {
        type: Sequelize.GEOMETRY('LINESTRING', 4326),
        allowNull: true
      },
      altRouteB: {
        type: Sequelize.GEOMETRY('LINESTRING', 4326),
        allowNull: true
      },
      response: {
        type: Sequelize.JSON
      }
    },
    {
      sequelize: db,
      tableName: 'directions',
      timestamps: false,
      underscored: true,
      freezeTableName: true,
      indexes: [
        { fields: ['start_point'] },
        { fields: ['duration'] },
        { fields: ['distance'] }
      ]
    }
  );

  // Manually create goespatial indexes
  let manualIndexes = [
    'CREATE INDEX IF NOT EXISTS directions_start_point_geo ON directions USING GIST(start_point)',
    'CREATE INDEX IF NOT EXISTS directions_end_point_geo ON directions USING GIST(end_point)',
    'CREATE INDEX IF NOT EXISTS directions_mid_point_geo ON directions USING GIST(mid_point)',
    'CREATE INDEX IF NOT EXISTS directions_route_geo ON directions USING GIST(route)',
    'CREATE INDEX IF NOT EXISTS directions_alt_route_a_geo ON directions USING GIST(alt_route_a)',
    'CREATE INDEX IF NOT EXISTS directions_alt_route_b_geo ON directions USING GIST(alt_route_b)'
  ];
  const runManualIndexes = async db => {
    for (let i of manualIndexes) {
      await db.query(i);
    }
  };
  Directions.runManualIndexes = runManualIndexes;

  return Directions;
}

// Add srid
function addSrid(geometry, srid = '4326') {
  geometry.crs = { type: 'name', properties: { name: `EPSG:${srid}` } };
  return geometry;
}
