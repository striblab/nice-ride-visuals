/**
 * Get trips and directions
 */

// Dependencies
const Sequelize = require('sequelize');
const moment = require('moment-timezone');
//const debug = require('debug')('export-trips-directions');
require('dotenv').load();

// All times should be
moment.tz.setDefault('America/Chicago');

// Do main
main();

// Main
async function main(day = '2018-07-21') {
  let dayM = moment(day, 'YYYY-MM-DD');

  try {
    const db = await setup();
    let rows = await db.query(
      `
      SELECT
        t.start_time,
        t.end_time,
        t.start_point,
        t.end_point,
        t.duration,
        t.gender,
        t.bike_type,
        d.route,
        d.distance,
        d.duration AS directions_duration,
        d.alt_route_a,
        d.alt_route_b
      FROM
        trips AS t
        INNER JOIN directions AS d
          ON t.start_point = d.start_point
          AND t.end_point = d.start_point
      WHERE
        DATE(t.start_time) = '${day}'
      ORDER BY
        t.start_time
      LIMIT 2000
    `,
      { type: db.QueryTypes.SELECT }
    );

    process.stdout.write(
      JSON.stringify(
        rows.map(r => {
          return {
            s: moment(r.start_time).diff(dayM, 'seconds', true),
            e: moment(r.end_time).diff(dayM, 'seconds', true),
            st: r.start_point.coordinates,
            en: r.end_point.coordinates,
            g: r.gender,
            b: r.bike_type,
            d: r.duration,
            rdis: r.distance,
            rdur: r.directions_duration,
            r: r.route.coordinates,
            ra: r.alt_route_a ? r.alt_route_a.coordinates : undefined,
            rb: r.alt_route_b ? r.alt_route_b.coordinates : undefined
          };
        })
      )
    );
    process.stdout.write('\n');
  }
  catch (e) {
    console.error(e);
  }
}

// Setup
async function setup() {
  let db = new Sequelize(process.env.TABLES_DB_URI, { logging: false });
  await db.authenticate();
  return db;
}
