import Poco from "commodetto/Poco";
import parseBMF from "commodetto/parseBMF";
import parseRLE from "commodetto/parseRLE";
import Battery from "embedded:sensor/Battery";
import Location from "embedded:sensor/Location";


const render = new Poco(screen);

// Load a custom font from BMF resources
function getFont(name, size) {
    const font = parseBMF(new Resource(`${name}-${size}.fnt`));
    font.bitmap = parseRLE(new Resource(`${name}-${size}-alpha.bm4`));
    return font;
}

// Fonts
const timeFont = getFont("Jersey10-Regular", 64);
const dateFont = getFont("Jersey10-Regular", 32);
//const timeFont = new render.Font("Bitham-Bold", 42);
//const dateFont = new render.Font("Gothic-Bold", 24);
const smallFont = new render.Font("Gothic-Regular", 18);

// Colors
const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);
const green = render.makeColor(0, 170, 0);
const yellow = render.makeColor(255, 170, 0);
const red = render.makeColor(255, 0, 0);

// Day and month names
const DAYS = ["Sun", "Mon", "Die", "Mit", "Don", "Fre", "Sat"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
                "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

// Precompute layout positions
const blockHeight = timeFont.height + dateFont.height;
const timeY = (render.height - blockHeight) / 2;
const dateY = timeY + timeFont.height;

// Store latest time for redraws triggered by battery/connection changes
let lastDate = new Date();

// weather
let weather = null;
let latitude = null;
let longitude = null;

// Battery state
let batteryPercent = 100;

const battery = new Battery({
    onSample() {
        batteryPercent = this.sample().percent;
        drawScreen();
    }
});
batteryPercent = battery.sample().percent;

// Connection state
let isConnected = true;

function checkConnection() {
    isConnected = watch.connected.app;
    drawScreen();
}
watch.addEventListener("connected", checkConnection);
checkConnection();

//location
let location = null;

function requestLocation() {
    location = new Location({
        onSample() {
            const sample = this.sample();
            console.log("Got location: " + sample.latitude + ", " + sample.longitude);
            this.close();
            fetchWeather(sample.latitude, sample.longitude);
        }
    });
}

function getWeatherDescription(code) {
    if (code === 0) return "Klar";
    if (code <= 3) return "Bewölkt";
    if (code <= 48) return "Nebel";
    if (code <= 55) return "Nieselregen";
    if (code <= 57) return "Gefrierender Nieselregen";
    if (code <= 65) return "Regen";
    if (code <= 67) return "Gefrierender Regen";
    if (code <= 75) return "Schnee";
    if (code <= 77) return "Schneegraupel";
    if (code <= 82) return "Regen-Schauer";
    if (code <= 86) return "Schnee Schauer";
    if (code === 95) return "Gewitter";
    if (code <= 99) return "Gewitter";
    return "Unknown";
}

async function fetchWeather(latitude, longitude) {
    try {
        const url = new URL("http://api.open-meteo.com/v1/forecast");
        url.search = new URLSearchParams({
            latitude,
            longitude,
            current: "temperature_2m,weather_code"
        });

        console.log("Fetching weather...");
        const response = await fetch(url);
        const data = await response.json();

        weather = {
            temp: data.current.temperature_2m,
            conditions: getWeatherDescription(data.current.weather_code)
        };

        console.log("Weather: " + weather.temp + "C, " + weather.conditions);
        drawScreen();

    } catch (e) {
        console.log("Weather fetch error: " + e);
    }
}



function drawBatteryBar() {
    const barWidth = (render.width / 2) | 0;
    const barX = ((render.width - barWidth) / 2) | 0;
    const barY = render.height < 180 ? 6 : 20;
    const barHeight = 8;

    // Draw border
    render.fillRectangle(white, barX, barY, barWidth, barHeight);
    render.fillRectangle(black, barX + 1, barY + 1, barWidth - 2, barHeight - 2);

    // Choose color based on battery level
    let barColor;
    if (batteryPercent <= 20) {
        barColor = red;
    } else if (batteryPercent <= 40) {
        barColor = yellow;
    } else {
        barColor = green;
    }

    // Draw filled portion
    const fillWidth = ((batteryPercent * (barWidth - 4)) / 100) | 0;
    render.fillRectangle(barColor, barX + 2, barY + 2, fillWidth, barHeight - 4);
}

function drawScreen(event) {
    const now = event?.date ?? lastDate;
    if (event?.date) lastDate = event.date;

    render.begin();
    render.fillRectangle(black, 0, 0, render.width, render.height);

    // Draw battery bar at top
    drawBatteryBar();

    // Draw Bluetooth disconnect indicator below battery bar
    if (!isConnected) {
        const btStr = "X";
        const btWidth = render.getTextWidth(btStr, smallFont);
        const btY = render.height < 180 ? 16 : 30;
        render.drawText(btStr, smallFont, red,
            (render.width - btWidth) / 2, btY);
    }

    // Format time as HH:MM
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    // Draw time centered
    let width = render.getTextWidth(timeStr, timeFont);
    render.drawText(timeStr, timeFont, white,
        (render.width - width) / 2, timeY);

    // Format date as "Mon Jan 01"
    const dayName = DAYS[now.getDay()];
    const monthName = MONTHS[now.getMonth()];
    const dateStr = `${dayName} ${monthName} ${String(now.getDate()).padStart(2, "0")}`;

    // Draw date centered below time
    width = render.getTextWidth(dateStr, dateFont);
    render.drawText(dateStr, dateFont, white,
        (render.width - width) / 2, dateY);

    // weather
    // Draw weather at bottom
    const weatherY = render.height - smallFont.height -  (render.height < 180 ? 6 : 20);
    if (weather) {
        const weatherStr = `${weather.temp}°C ${weather.conditions}`;
        width = render.getTextWidth(weatherStr, smallFont);
        render.drawText(weatherStr, smallFont, white,
            (render.width - width) / 2, weatherY);
    } else {
        const msg = "Loading...";
        width = render.getTextWidth(msg, smallFont);
        render.drawText(msg, smallFont, white,
            (render.width - width) / 2, weatherY);
    }


    render.end();
}


// Update every minute (fires immediately when registered)
watch.addEventListener("minutechange", drawScreen);


// Update weather each hour
watch.addEventListener("hourchange", requestLocation);
