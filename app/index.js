/**
 * Main JS file for project.
 */

/**
 * Define globals that are added through the js.globals in
 * the config.json file, here, mostly so linting won't get triggered
 * and its a good queue of what is available:
 */
/* global mapboxgl, deck */

// Dependencies
import utils from './shared/utils.js';
import stribMaps from '@striblab/strib-styles/build/strib-styles.maps.js';
import tripData from '../assets/data/trips.json';

console.dir(deck);
console.dir(tripData);

utils.documentReady(() => {
  // Mark page with note about development or staging
  utils.environmentNoting();

  // Set mapbox token
  mapboxgl.accessToken =
    'pk.eyJ1Ijoic2hhZG93ZmxhcmUiLCJhIjoiODRHdjBSWSJ9.lF4ymp-69zdGvZ5X4Tokzg';

  // Create map
  const map = new mapboxgl.Map({
    container: 'test-el',
    style: stribMaps.mapboxStyles.light,
    // Note: deck.gl will be in charge of interaction and event handling
    //interactive: false,
    center: stribMaps.places.minneapolis,
    zoom: 12,
    bearing: 0,
    pitch: 30
  });

  // When loaded
  map.on('load', () => {
    const now = +new Date();

    // Create deck
    const deckLayer = new deck.MapboxLayer({
      type: deck.TripsLayer,
      id: 'trips-layer',
      data: tripData,
      // deduct start timestamp from each data point to avoid overflow
      getPath: d => d.r.map((p, pi) => [p[0], p[1], 200 * pi]),
      getColor: [253, 128, 93],
      opacity: 0.8,
      widthMinPixels: 5,
      rounded: true,
      trailLength: 100,
      currentTime: 0
    });

    // Attach to map
    map.addLayer(deckLayer);

    setInterval(() => {
      //console.log(c);
      deckLayer.setProps({
        currentTime: +new Date() - now
      });
    }, 100);

    // update the layer
    // deck.setProps({
    //   layers: [
    //       new ScatterplotLayer({
    //           id: 'my-scatterplot',
    //           data: [
    //               {position: [-74.5, 40], size: 100}
    //           ],
    //           getPosition: d => d.position,
    //           getRadius: d => d.size,
    //           getFillColor: [0, 0, 255]
    //       })
    //   ]
    // });
  });
});

// Common code to get svelte template loaded on the client and hack-ishly
// handle sharing
//
// import Content from '../templates/_index-content.svelte.html';
//
// utils.documentReady(() => {
//   // Deal with share place holder (remove the elements, then re-attach
//   // them in the app component)
//   const attachShare = utils.detachAndAttachElement('.share-placeholder');
//
//   // Main component
//   const app = new Content({
//     target: document.querySelector('.article-lcd-body-content'),
//     hydrate: true,
//     data: {
//       attachShare
//     }
//   });
// });
