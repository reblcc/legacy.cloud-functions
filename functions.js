///////////////////////////////////////////////////////////////////////////////
// Initialization
///////////////////////////////////////////////////////////////////////////////

const { Pool, Client } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: '<removed>',
  database: 'markers',
  password: '<removed>',
  port: 5432
})

///////////////////////////////////////////////////////////////////////////////
// API Endpoints
///////////////////////////////////////////////////////////////////////////////

//
// Simply returns the number of marker nodes in total.
// TODO: Offer a filter by key type?
//
exports.count = (req, res) => {
  pool.query('SELECT COUNT(*) FROM nodes', (err, result) => {
    if (err) {
     res.status(500).send(err); 
    } else {
      res.status(200).send(JSON.stringify({'markers' : {'count': result}}));
    }      
  })  
};


//
// Return markers in a specified geographical area using a center point
// and radius.
//
// Parameters: 
//      lat: Latitude of the center point
//      lon: Longitude of the center point
//      radius: radius of the area in meters.
//
exports.markers = (req, res) => {

  var lat = req.query.lat;
  var lon = req.query.lon;
  var distance = req.query.distance;

  var err = validateLat(lat);
  if (err) {
    res.status(400).send(JSON.stringify({'message': err}));
  }
  var err = validateLon(lon);
  if (err) {
    res.status(400).send(JSON.stringify({'message': err}));
  } 
  var err = validateDistance(distance);
  if (err) {
    res.status(400).send(JSON.stringify({'message': err}));
  }

  const text = "select id, osm_id, ST_Y(location::geometry) as lat, ST_X(location::geometry) as lon, keys FROM nodes WHERE ST_DWithin(location, ST_POINT($2,$1), $3)"
  pool.query(text, [lat, lon, distance], (err, result) => {
    if (err) {
     res.status(500).send(err); 
    } else {
      var markers = [];
      // markers.push({'results': result.rows.length});
      for (var i = 0; i < result.rows.length; i++) {
        var row = result.rows[i];
        markers.push({'id': row.id, 'osm_id' : row.osm_id, 'lat' : row.lat, 'lon' : row.lon, 'keys' : row.keys})        
      }
      res.status(200).send(JSON.stringify(markers));
    }      
  });
};



///////////////////////////////////////////////////////////////////////////////
// Utility methods/types
///////////////////////////////////////////////////////////////////////////////

function validateLat(lat) {
  if (lat) {
    if (isNaN(lat)) {
      return "Latitude is not a number"
    } else if (lat < -90 || lat > 90) {
      return "Latitude must be between -90 and 90"
    }
  } else {
    return "Latitude not defined"
  }
}

function validateLon(lon) {
  if (lon) {
    if (isNaN(lon)) {
      return "Longitude is not a number"
    } else if (lon < -180 || lon > 180) {
      return "Longitude must be between -180 and 180"
    }
  } else {
    return "Longitude not defined"
  }
}

//
// For sanity, we're going to cap distance to
// 161km (about 100 miles).  We may want to modify
// this in the future
//
function validateDistance(distance) {
  if (distance) {
    if (isNaN(distance)) {
      return "Distance is not a number"
    } else if (distance < 0 || distance > 161000) {
      return "Distance must be between 0 and 161,000"
    }
  } else {
    return "Distance not defined"
  }
}
