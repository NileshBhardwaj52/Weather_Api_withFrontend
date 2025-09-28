# Weather API

A full-featured weather API with demo interface.

## Features

- Current weather data
- 5-day weather forecast
- Weather by coordinates or city name
- Rate limiting and security headers
- Beautiful demo interface
- Error handling

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your OpenWeatherMap API key:
   ```
   OPENWEATHER_API_KEY=your_api_key_here
   PORT=3000
   ```

3. Get your free API key from [OpenWeatherMap](https://openweathermap.org/api)
4. and paste the secret key in .env file 

5. Start the server:
   ```bash
   npm start
   ```
   
   Or for development:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000 to see the demo

## API Endpoints

### Get Current Weather
```
GET /api/weather/current?city=London
GET /api/weather/current?lat=51.5074&lon=-0.1278
```

### Get 5-Day Forecast
```
GET /api/weather/forecast?city=London
GET /api/weather/forecast?lat=51.5074&lon=-0.1278
```

### Response Format
```json
{
  "success": true,
  "data": {
    "location": "London, GB",
    "temperature": 15,
    "description": "scattered clouds",
    "humidity": 65,
    "windSpeed": 3.5,
    "pressure": 1013
  }
}
```

## Tech Stack

- Node.js
- Express.js
- OpenWeatherMap API
- HTML/CSS/JavaScript (Demo)

## License

MIT
