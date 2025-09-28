class WeatherAPI {
    constructor() {
        this.baseURL = '/api/weather';
        this.units = 'metric';
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);
    }

    bindEvents() {
        const cityInput = document.getElementById('cityInput');
        const searchBtn = document.getElementById('searchBtn');
        const locationBtn = document.getElementById('locationBtn');
        const unitToggle = document.getElementById('unitToggle');

        searchBtn.addEventListener('click', () => this.searchWeather());
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });
        locationBtn.addEventListener('click', () => this.getCurrentLocation());
        unitToggle.addEventListener('change', (e) => {
            this.units = e.target.checked ? 'imperial' : 'metric';
            const currentCity = document.getElementById('locationName').textContent;
            if (currentCity !== 'Location') {
                this.searchWeather();
            }
        });
    }

    updateTime() {
        const now = new Date();
        const timeString = now.toLocaleString();
        const currentTimeEl = document.getElementById('currentTime');
        if (currentTimeEl) {
            currentTimeEl.textContent = timeString;
        }
    }

    async searchWeather() {
        const cityInput = document.getElementById('cityInput');
        let city = cityInput.value.trim();
        
        if (!city) {
            this.showError('Please enter a city name');
            return;
        }

        // For Indian cities, try different formats to improve search accuracy
        const cityFormats = [
            city, // Original input
        ];
        
        // If it's a single word and might be an Indian city, try adding ",India"
        if (!city.includes(',') && city.split(' ').length <= 2) {
            cityFormats.push(`${city},India`);
            cityFormats.push(`${city},IN`);
        }

        try {
            this.showLoading();
            
            // Try different city formats until one works
            let weatherData = null;
            let forecastData = null;
            let lastError = null;
            
            for (const cityFormat of cityFormats) {
                try {
                    console.log(`Trying city format: ${cityFormat}`);
                    const results = await Promise.all([
                        this.getCurrentWeather({ city: cityFormat }),
                        this.getForecast({ city: cityFormat })
                    ]);
                    weatherData = results[0];
                    forecastData = results[1];
                    break; // Success! Break out of the loop
                } catch (error) {
                    lastError = error;
                    console.log(`Failed with format "${cityFormat}":`, error.message);
                    // Continue to next format
                }
            }
            
            if (!weatherData) {
                throw lastError || new Error('City not found with any format');
            }
            
        } catch (error) {
            console.error('Search weather error:', error);
            this.showError(error.message);
        }
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        };

        try {
            this.showLoading();
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            const { latitude: lat, longitude: lon } = position.coords;
            
            await Promise.all([
                this.getCurrentWeather({ lat, lon }),
                this.getForecast({ lat, lon })
            ]);
        } catch (error) {
            let message = 'Failed to get location';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Location access denied. Please allow location access and try again.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Location information is unavailable.';
            } else if (error.code === error.TIMEOUT) {
                message = 'Location request timed out.';
            }
            this.showError(message);
        }
    }

    async getCurrentWeather(params) {
        const url = new URL(`${this.baseURL}/current`, window.location.origin);
        url.searchParams.set('units', this.units);
        
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch weather data');
            }

            this.displayCurrentWeather(data.data);
            return data.data;
        } catch (error) {
            console.error('Weather fetch error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to weather service. Please check if the server is running.');
            }
            throw error;
        }
    }

    async getForecast(params) {
        const url = new URL(`${this.baseURL}/forecast`, window.location.origin);
        url.searchParams.set('units', this.units);
        
        Object.keys(params).forEach(key => {
            url.searchParams.set(key, params[key]);
        });

        try {
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch forecast data');
            }

            this.displayForecast(data.data);
            return data.data;
        } catch (error) {
            console.error('Forecast fetch error:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Cannot connect to weather service. Please check if the server is running.');
            }
            throw error;
        }
    }

    displayCurrentWeather(data) {
        // Update location and basic info
        document.getElementById('locationName').textContent = data.location;
        document.getElementById('currentTemp').textContent = `${data.temperature}°`;
        document.getElementById('feelsLike').textContent = `${data.feelsLike}°`;
        document.getElementById('weatherDescription').textContent = data.description;
        
        // Update weather icon
        const weatherIcon = document.getElementById('weatherIcon');
        weatherIcon.src = `https://openweathermap.org/img/wn/${data.icon}@2x.png`;
        weatherIcon.alt = data.description;

        // Update weather stats
        document.getElementById('humidity').textContent = `${data.humidity}%`;
        document.getElementById('pressure').textContent = `${data.pressure} hPa`;
        document.getElementById('visibility').textContent = `${data.visibility} km`;
        
        // Update wind speed with correct units
        const windSpeedUnit = this.units === 'imperial' ? 'mph' : 'm/s';
        document.getElementById('windSpeed').textContent = `${data.windSpeed} ${windSpeedUnit}`;

        // Update sun times
        const sunrise = new Date(data.sunrise);
        const sunset = new Date(data.sunset);
        document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        document.getElementById('sunset').textContent = sunset.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        this.hideLoading();
        this.showWeatherContainer();
    }

    displayForecast(data) {
        const forecastContainer = document.getElementById('forecastContainer');
        forecastContainer.innerHTML = '';

        // Group forecast by day (take one forecast per day, preferably around noon)
        const dailyForecasts = this.groupForecastByDay(data.forecast);

        dailyForecasts.forEach(forecast => {
            const forecastEl = this.createForecastElement(forecast);
            forecastContainer.appendChild(forecastEl);
        });
    }

    groupForecastByDay(forecasts) {
        const dailyMap = new Map();
        
        forecasts.forEach(forecast => {
            const date = new Date(forecast.datetime);
            const dayKey = date.toDateString();
            
            if (!dailyMap.has(dayKey)) {
                dailyMap.set(dayKey, []);
            }
            dailyMap.get(dayKey).push(forecast);
        });

        const dailyForecasts = [];
        for (const [day, dayForecasts] of dailyMap) {
            // Try to find forecast around noon (12:00), otherwise take the first one
            let selectedForecast = dayForecasts.find(f => {
                const hour = new Date(f.datetime).getHours();
                return hour >= 11 && hour <= 13;
            }) || dayForecasts[0];

            // Calculate min and max temperatures for the day
            const temps = dayForecasts.map(f => f.temperature);
            const minTemp = Math.min(...temps);
            const maxTemp = Math.max(...temps);

            dailyForecasts.push({
                ...selectedForecast,
                minTemp,
                maxTemp,
                day
            });
        }

        return dailyForecasts.slice(0, 5); // Return only 5 days
    }

    createForecastElement(forecast) {
        const forecastEl = document.createElement('div');
        forecastEl.className = 'forecast-day';

        const date = new Date(forecast.datetime);
        const isToday = date.toDateString() === new Date().toDateString();
        const dayName = isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });

        forecastEl.innerHTML = `
            <div class="forecast-date">${dayName}</div>
            <div class="forecast-icon">
                <img src="https://openweathermap.org/img/wn/${forecast.icon}.png" alt="${forecast.description}" />
            </div>
            <div class="forecast-temps">
                <span class="forecast-high">${forecast.maxTemp}°</span>
                <span class="forecast-low">${forecast.minTemp}°</span>
            </div>
            <div class="forecast-desc">${forecast.description}</div>
        `;

        return forecastEl;
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.getElementById('weatherContainer').style.display = 'none';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('weatherContainer').style.display = 'none';
    }

    showWeatherContainer() {
        document.getElementById('weatherContainer').style.display = 'block';
        document.getElementById('error').style.display = 'none';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WeatherAPI();
});

// Service worker registration for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}