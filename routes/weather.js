const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const ONE_CALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

// Middleware to check if API key is configured
const checkApiKey = (req, res, next) => {
  if (!OPENWEATHER_API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'OpenWeatherMap API key not configured'
    });
  }
  next();
};

// Helper function to validate coordinates
const validateCoordinates = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  
  return !isNaN(latitude) && !isNaN(longitude) && 
         latitude >= -90 && latitude <= 90 && 
         longitude >= -180 && longitude <= 180;
};

// Helper function to format weather data
const formatWeatherData = (data) => {
  return {
    location: `${data.name}, ${data.sys.country}`,
    coordinates: {
      lat: data.coord.lat,
      lon: data.coord.lon
    },
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    icon: data.weather[0].icon,
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    windSpeed: data.wind.speed,
    windDirection: data.wind.deg,
    visibility: data.visibility / 1000, // Convert to km
    cloudiness: data.clouds.all,
    sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
    sunset: new Date(data.sys.sunset * 1000).toISOString(),
    timezone: data.timezone
  };
};

// Helper function to format forecast data
const formatForecastData = (data) => {
  return {
    location: `${data.city.name}, ${data.city.country}`,
    coordinates: {
      lat: data.city.coord.lat,
      lon: data.city.coord.lon
    },
    forecast: data.list.map(item => ({
      datetime: item.dt_txt,
      timestamp: item.dt,
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      windSpeed: item.wind.speed,
      windDirection: item.wind.deg,
      cloudiness: item.clouds.all,
      precipitationProbability: item.pop * 100
    }))
  };
};

// Get current weather by city name or coordinates
router.get('/current', checkApiKey, async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    let url = `${BASE_URL}/weather?appid=${OPENWEATHER_API_KEY}&units=${units}`;
    
    if (city) {
      url += `&q=${encodeURIComponent(city)}`;
    } else if (lat && lon) {
      if (!validateCoordinates(lat, lon)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
        });
      }
      url += `&lat=${lat}&lon=${lon}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either city name or coordinates (lat, lon)'
      });
    }
    
    console.log(`Fetching weather data from: ${url.replace(OPENWEATHER_API_KEY, '[API_KEY_HIDDEN]')}`);
    
    const response = await axios.get(url);
    const weatherData = formatWeatherData(response.data);
    
    res.json({
      success: true,
      data: weatherData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Weather API error:', error.response?.data || error.message);
    console.error('Request URL:', error.config?.url?.replace(OPENWEATHER_API_KEY, '[API_KEY_HIDDEN]'));
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Location not found. Please check the city name and try again.'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'API key is invalid or not activated yet. Please check your OpenWeatherMap API key.'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'API rate limit exceeded. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get 5-day weather forecast
router.get('/forecast', checkApiKey, async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    let url = `${BASE_URL}/forecast?appid=${OPENWEATHER_API_KEY}&units=${units}`;
    
    if (city) {
      url += `&q=${encodeURIComponent(city)}`;
    } else if (lat && lon) {
      if (!validateCoordinates(lat, lon)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
        });
      }
      url += `&lat=${lat}&lon=${lon}`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either city name or coordinates (lat, lon)'
      });
    }
    
    const response = await axios.get(url);
    const forecastData = formatForecastData(response.data);
    
    res.json({
      success: true,
      data: forecastData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Forecast API error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch forecast data'
    });
  }
});

// Get weather by multiple cities
router.post('/multiple', checkApiKey, async (req, res) => {
  try {
    const { cities, units = 'metric' } = req.body;
    
    if (!cities || !Array.isArray(cities) || cities.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an array of city names'
      });
    }
    
    if (cities.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 cities allowed per request'
      });
    }
    
    const weatherPromises = cities.map(async (city) => {
      try {
        const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
        const response = await axios.get(url);
        return {
          city,
          success: true,
          data: formatWeatherData(response.data)
        };
      } catch (error) {
        return {
          city,
          success: false,
          error: error.response?.status === 404 ? 'City not found' : 'Failed to fetch data'
        };
      }
    });
    
    const results = await Promise.all(weatherPromises);
    
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Multiple cities API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data for multiple cities'
    });
  }
});

// Get comprehensive weather data using One Call API 3.0 (Premium)
router.get('/onecall', checkApiKey, async (req, res) => {
  try {
    const { lat, lon, units = 'metric', exclude } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: 'Please provide coordinates (lat, lon) for One Call API'
      });
    }
    
    if (!validateCoordinates(lat, lon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
      });
    }
    
    let url = `${ONE_CALL_URL}?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=${units}`;
    
    if (exclude) {
      url += `&exclude=${exclude}`;
    }
    
    const response = await axios.get(url);
    const data = response.data;
    
    // Format the comprehensive weather data
    const formattedData = {
      coordinates: { lat: data.lat, lon: data.lon },
      timezone: data.timezone,
      timezoneOffset: data.timezone_offset,
      current: {
        datetime: new Date(data.current.dt * 1000).toISOString(),
        sunrise: new Date(data.current.sunrise * 1000).toISOString(),
        sunset: new Date(data.current.sunset * 1000).toISOString(),
        temperature: Math.round(data.current.temp),
        feelsLike: Math.round(data.current.feels_like),
        pressure: data.current.pressure,
        humidity: data.current.humidity,
        dewPoint: Math.round(data.current.dew_point),
        uvIndex: data.current.uvi,
        clouds: data.current.clouds,
        visibility: data.current.visibility / 1000,
        windSpeed: data.current.wind_speed,
        windDirection: data.current.wind_deg,
        weather: data.current.weather[0],
      }
    };
    
    // Add hourly forecast if available
    if (data.hourly) {
      formattedData.hourly = data.hourly.slice(0, 24).map(hour => ({
        datetime: new Date(hour.dt * 1000).toISOString(),
        temperature: Math.round(hour.temp),
        feelsLike: Math.round(hour.feels_like),
        pressure: hour.pressure,
        humidity: hour.humidity,
        dewPoint: Math.round(hour.dew_point),
        uvIndex: hour.uvi,
        clouds: hour.clouds,
        visibility: hour.visibility / 1000,
        windSpeed: hour.wind_speed,
        windDirection: hour.wind_deg,
        weather: hour.weather[0],
        pop: Math.round(hour.pop * 100)
      }));
    }
    
    // Add daily forecast if available
    if (data.daily) {
      formattedData.daily = data.daily.slice(0, 7).map(day => ({
        datetime: new Date(day.dt * 1000).toISOString(),
        sunrise: new Date(day.sunrise * 1000).toISOString(),
        sunset: new Date(day.sunset * 1000).toISOString(),
        moonrise: new Date(day.moonrise * 1000).toISOString(),
        moonset: new Date(day.moonset * 1000).toISOString(),
        moonPhase: day.moon_phase,
        summary: day.summary,
        temperature: {
          day: Math.round(day.temp.day),
          min: Math.round(day.temp.min),
          max: Math.round(day.temp.max),
          night: Math.round(day.temp.night),
          evening: Math.round(day.temp.eve),
          morning: Math.round(day.temp.morn)
        },
        feelsLike: {
          day: Math.round(day.feels_like.day),
          night: Math.round(day.feels_like.night),
          evening: Math.round(day.feels_like.eve),
          morning: Math.round(day.feels_like.morn)
        },
        pressure: day.pressure,
        humidity: day.humidity,
        dewPoint: Math.round(day.dew_point),
        windSpeed: day.wind_speed,
        windDirection: day.wind_deg,
        weather: day.weather[0],
        clouds: day.clouds,
        pop: Math.round(day.pop * 100),
        uvIndex: day.uvi
      }));
    }
    
    res.json({
      success: true,
      data: formattedData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('One Call API error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key or subscription required'
      });
    }
    
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'API rate limit exceeded'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch One Call weather data'
    });
  }
});

module.exports = router;