/**
 * Tables config for nice-ride data
 * https://www.npmjs.com/package/tables
 */

// Dependencies
const moment = require('moment-timezone');
require('dotenv').load();

// All times should be
moment.tz.setDefault('America/Chicago');

// Counter
let counter = 0;

module.exports = {
  db: process.env.TABLES_DB_URI,
  transformer: (d, models, options) => {
    /*
    { tripduration: '693',
      start_time: '2018-04-24 16:48:16.5630',
      end_time: '2018-04-24 16:59:49.9680',
      'start station id': '210',
      'start station name': 'Civil Engineering',
      'start station latitude': '44.976096',
      'start station longitude': '-93.231958',
      'end station id': '214',
      'end station name': 'Mill City Quarter',
      'end station latitude': '44.9805',
      'end station longitude': '-93.2618',
      bikeid: '298',
      usertype: 'Subscriber',
      'birth year': '1988',
      gender: '1',
      'bike type': 'Classic' }
    */

    const coordPercision = i => {
      const p = 1000000;
      return i ? Math.round(p * i) / p : null;
    };

    let dateFormat = 'YYYYY-MM-DD HH:mm:ss.SSS';
    let start =
      d.start_time || d['start time']
        ? moment(d.start_time || d['start time'], dateFormat)
        : null;
    let end =
      d.end_time || d['end time']
        ? moment(d.end_time || d['end time'], dateFormat)
        : null;
    let startLatitude = coordPercision(d['start station latitude']);
    let startLongitude = coordPercision(d['start station longitude']);
    let endLatitude = coordPercision(d['end station latitude']);
    let endLongitude = coordPercision(d['end station longitude']);
    counter++;

    let parsed = {
      duration: d.tripduration ? parseInt(d.tripduration, 10) : null,
      startTime: start ? start.toDate() : null,
      endTime: end ? end.toDate() : null,
      startId: d['start station id'] ? d['start station id'] : null,
      startName: d['start station name'] ? d['start station name'] : null,
      startLatitude,
      startLongitude,
      // startPoint:
      //   startLatitude && startLongitude
      //     ? { type: 'Point', coordinates: [startLongitude, startLatitude] }
      //     : null,
      endId: d['end station id'] ? d['end station id'] : null,
      endName: d['end station name'] ? d['end station name'] : null,
      endLatitude,
      endLongitude,
      // endPoint:
      //   endLatitude && endLongitude
      //     ? { type: 'Point', coordinates: [endLongitude, endLatitude] }
      //     : null,
      bike: d['bikeid'] ? d['bikeid'] : null,
      userType: d['usertype'] ? d['usertype'].toLowerCase() : null,
      birthYear: d['birth year'] ? parseInt(d['birth year'], 10) : null,
      gender: d['gender'] ? d['gender'].toString() : null,
      bikeType: d['bike type'] ? d['bike type'].toLowerCase() : null
    };

    return {
      trip: parsed
    };
  },
  hooks: {
    finish: async (db, models, options) => {
      // Can;t find a good way to do this with Tables, since we are writing
      // raw queries but utilizing models.
      await db.query(
        `UPDATE ${models.trip.tableName} SET
        start_point = ST_SetSRID(ST_MakePoint(start_longitude, start_latitude), 4326),
        end_point = ST_SetSRID(ST_MakePoint(end_longitude, end_latitude), 4326)`
      );
    }
  },
  models: (db, Sequelize) => {
    class Trip extends Sequelize.Model {}
    Trip.init(
      {
        duration: {
          tablesInputColumn: 'tripduration',
          field: 'duration',
          type: Sequelize.INTEGER
        },
        startTime: {
          tablesInputColumn: 'start_time',
          field: 'start_time',
          type: Sequelize.DATE,
          primaryKey: true
        },
        endTime: {
          tablesInputColumn: 'end_time',
          field: 'end_time',
          type: Sequelize.DATE
        },
        startId: {
          tablesInputColumn: 'start station id',
          field: 'start_id',
          type: Sequelize.STRING(32)
        },
        startName: {
          tablesInputColumn: 'start station name',
          field: 'start_name',
          type: Sequelize.STRING(255)
        },
        startLatitude: {
          tablesInputColumn: 'start station latitude',
          field: 'start_latitude',
          type: Sequelize.FLOAT
        },
        startLongitude: {
          tablesInputColumn: 'start station longitude',
          field: 'start_longitude',
          type: Sequelize.FLOAT
        },
        startPoint: {
          field: 'start_point',
          type: Sequelize.GEOMETRY('POINT', 4326)
        },
        endId: {
          tablesInputColumn: 'end station id',
          field: 'end_id',
          type: Sequelize.STRING(32)
        },
        endName: {
          tablesInputColumn: 'end station name',
          field: 'end_name',
          type: Sequelize.STRING(255)
        },
        endLatitude: {
          tablesInputColumn: 'end station latitude',
          field: 'end_latitude',
          type: Sequelize.FLOAT
        },
        endLongitude: {
          tablesInputColumn: 'end station longitude',
          field: 'end_longitude',
          type: Sequelize.FLOAT
        },
        endPoint: {
          field: 'end_point',
          type: Sequelize.GEOMETRY('POINT', 4326)
        },
        bike: {
          tablesInputColumn: 'bikeid',
          field: 'bike',
          type: Sequelize.STRING(32),
          primaryKey: true
        },
        userType: {
          tablesInputColumn: 'usertype',
          field: 'user_type',
          type: Sequelize.STRING(32),
          primaryKey: true
        },
        birthYear: {
          tablesInputColumn: 'birth year',
          field: 'birth_year',
          type: Sequelize.INTEGER,
          primaryKey: true
        },
        gender: {
          tablesInputColumn: 'gender',
          field: 'gender',
          type: Sequelize.STRING(4)
        },
        bikeType: {
          tablesInputColumn: 'bike type',
          field: 'bike_type',
          type: Sequelize.STRING(32)
        }
      },
      {
        sequelize: db,
        tableName: 'trips',
        timestamps: false,
        underscored: true,
        freezeTableName: true,
        indexes: [
          { fields: ['duration'] },
          { fields: ['start_time'] },
          { fields: ['end_time'] },
          { fields: ['start_id'] },
          { fields: ['start_point'] },
          { fields: ['end_id'] },
          { fields: ['end_point'] },
          { fields: ['bike'] },
          { fields: ['user_type'] },
          { fields: ['birth_year'] },
          { fields: ['gender'] },
          { fields: ['bike_type'] }
        ]
      }
    );

    Trip.modelName = 'trip';
    return {
      trip: Trip
    };
  }
};
