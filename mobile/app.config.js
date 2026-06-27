const appJson = require('./app.json');

const expo = {
  ...appJson.expo,
  extra: {
    ...appJson.expo.extra,
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || appJson.expo.extra?.mapboxToken || '',
  },
};

module.exports = { expo };
