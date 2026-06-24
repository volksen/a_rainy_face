import Poco from "commodetto/Poco";

const render = new Poco(screen);

// Fonts
const timeFont = new render.Font("Bitham-Bold", 42);
const dateFont = new render.Font("Gothic-Bold", 24);

// Colors
const black = render.makeColor(0, 0, 0);
const white = render.makeColor(255, 255, 255);

// Day and month names for date formatting
const DAYS = ["Son", "Mon", "Die", "Mit", "Don", "Fre", "Sat"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun",
                "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function draw(event) {
    const now = event.date;

    render.begin();
    render.fillRectangle(black, 0, 0, render.width, render.height);

    // Format time as HH:MM
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    // Center the time vertically (shifted up slightly to make room for date)
    let width = render.getTextWidth(timeStr, timeFont);
    render.drawText(timeStr, timeFont, white,
        (render.width - width) / 2,
        (render.height / 2) - timeFont.height + 5);

    // Format date as "Mon Jan 01"
    const dayName = DAYS[now.getDay()];
    const monthName = MONTHS[now.getMonth()];
    const dateStr = `${dayName} ${String(now.getDate()).padStart(2, "0")}. ${monthName}`;

    // Draw date below the time
    width = render.getTextWidth(dateStr, dateFont);
    render.drawText(dateStr, dateFont, white,
        (render.width - width) / 2,
        (render.height / 2) + 10);

    render.end();
}

// Update every minute (fires immediately when registered)
watch.addEventListener("minutechange", draw);
