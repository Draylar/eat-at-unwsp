// Document elements
const filterDatePicker = document.getElementById("filter-date");
const primaryMenuElement = document.getElementById("menu-primary");
const menuElement = document.getElementById("menu");
const errorLabelElement = document.getElementById("error-label");

// Constants
const defaultOptions = {
    vegetarian: false,
    vegan: false,
    gluten_free: false,
    well_being: false,
    dining_funds: false,
    special_only: true,
    hide_options: false
}

const dietaryOptions = [ 'gluten_free', 'well_being', 'vegetarian', 'vegan']

// Application values
const localStorageKey = "eat@unwsp";
const cachedMenuData = new Map();
var todayDate;
var visibleDate;
var selectedDaypart = "breakfast";

// ---------------------- MAIN APPLICATION LOGIC ---------------------- //

initializeDateInput();
displayDMYMenu(todayDate);

// menuElement.style.minHeight = window.height


// ---------------------- MENU AND DATA RETRIEVING ---------------------- //

function displayDMYMenu(date) {
    displayMenu(DMY_to_YMD(date, "-"));
}

/**
 * Retrieves food data for the given day.
 * The order of priority for checks is:
 *   1. local data Map
 *   2. web call to food service
 */
function displayMenu(date) {
    visibleDate = date;

    console.log(`Retrieving data for ${date}`);

    if(!cachedMenuData.has(date)) {
        console.log(`sending web request for ${date} data`)

        getPrimaryMenuThroughAPI(date)
            .then(data => {
                data['primary'] = readOption("special_only");
                cachedMenuData.set(date, data);
                refreshDisplay();
            });
    } else {
        refreshDisplay();
    }
}

function refreshDisplay() {
    primaryMenuElement.innerHTML = "";
    errorLabelElement.innerHTML = "";

    const selectedSpecialOnly = readOption("special_only");
    const categories = new Map(); // category => list of food options
    var data;

    // Check if the cached data has the data being requested.
    // It should always have the required data at this point.
    if(cachedMenuData.has(visibleDate)) {
        // Filter buttons save themselves to the user's application storage on press.
        // If the current data being shown to the user is only primary, and the user unclicks the "show special items" option,
        //      "special_only" is set to false. We check for both of those occuring here.
        // If both conditions pass, we clear the local storage, then attempt to display the menu again.
        // The property saved to local storage is used when the API request is sent, so all information will be returned by the server.
        // In the case that the client has ALL information for a given day, no future requests are sent.
        // This is done to not send large requests when the user first visits the application (data is served on request).
        // TODO: this could be made more clear by passing values around in method calls rather than relying on hidden storage properties.
        if(cachedMenuData.get(visibleDate).primary) {
            if(!readOption("special_only")) {
                cachedMenuData.delete(visibleDate);
                displayMenu(visibleDate);
                return;
            }
        }

        data = cachedMenuData.get(visibleDate);
    } else {
        console.log(`refreshDisplay() tried to get data for ${visibleDate} from local cache, but none was found!`);
        return;
    }

    // Check for errors in the data saved
    if(data.error !== undefined) {
        console.log(`No menu items found for ${visibleDate}.`);

        errorLabelElement.innerHTML = `No menu items were found for ${visibleDate}. The cafe may be closed, or the menu has not been uploaded yet.`

        return;
    }

    data.items.forEach(item => {
        // Check if the given item is valid for our current filters
        for(var option in dietaryOptions) {
            if(readOption(dietaryOptions[option])) {
                if(!item.filters[dietaryOptions[option]]) {
                    return;
                }
            }
        };

        // Check if the given item is available at the currently selected dayPart
        if(item.availability.some(element => element.split(":")[0] == selectedDaypart)) {

            // Ensure the food's primary/special status matches the filter
            if(selectedSpecialOnly && !item.special) {
                return;
            }
            
            // Get the category from the food's availability at the currently selected dayPart
            // TODO: we could combine this with the above check
            const availability = item.availability.find(element => element.split(":")[0] == selectedDaypart);
            const category = availability.split(":")[1]; // pasta/pizza/grill/etc.
            
            // Initialize data array for the given category if it does not exist
            if(!categories.has(category)) {
                categories.set(category, []);
            }

            categories.get(category).push(item);
        }
    });

    categories.forEach((value, key, map) => {
        addMenuCategoryElement(key, value);
    })
}

function addMenuCategoryElement(category, elements) {
    const diningFunds = readOption("dining_funds");

    const stationElement = document.createElement("div");
    stationElement.classList.add("station-element");

    const image = document.createElement("img");
    image.src = `resources/${category}.jpg`
    image.classList.add("station-image");
    primaryMenuElement.appendChild(image);

    const stationTitle = document.createElement("p");
    stationTitle.classList.add("station-title");
    stationTitle.innerHTML = category;
    stationElement.appendChild(stationTitle);

    elements.forEach(element => {
        // get df and retail price from price element, which may or may not be present
        var finalPrice = "";

        if(element.price.length > 0) {
            // No marked differences for d.f., eg. $0.99
            if(!element.price.includes("d.f.") && !(element.price.includes("retail"))) {
                finalPrice = element.price.replace("$", "");
            }

            else {
                const price = element.price.replace("d.f.", "").replace("retail", "").split("/");
                if(price[0] == undefined || price[1] == undefined) {
                    console.log(price);
                }
                const df = price[0].trim();
                const retail = price[1].trim();
                finalPrice = `${diningFunds ? df : retail}`;
            }
        }

        // todo: ???????????? soul has weird price formatting for cups vs. bowls

        const stationEntry = document.createElement("div");
        stationEntry.classList.add("station-entry");

        const entryTitle = document.createElement("p");
        entryTitle.classList.add("entry-title");
        entryTitle.innerHTML = `${element.label}${finalPrice.length > 0 ? ` - $${finalPrice}` : ""}`

        const entryDescription = document.createElement("p");
        entryDescription.classList.add("entry-description");
        entryDescription.innerHTML = element.description;

        stationEntry.appendChild(entryTitle);
        stationEntry.appendChild(entryDescription);
        stationElement.appendChild(stationEntry);
    });

    // const hr = document.createElement("hr");
    // hr.classList.add("station-divider");
    // primaryMenuElement.appendChild(hr);

    primaryMenuElement.appendChild(stationElement);
}

/**
 * Retrieves data for the given date through a web call.
 * Incoming date should be in the format YYYY-MM-DD.
 * Single-digit numbers must be prefixed with a 0 (1 => 01).
 */
function getPrimaryMenuThroughAPI(date) {
    return new Promise((resolve, reject) => {
        fetch(`http://localhost:5500/api/menu?date=${date}&primary=${readOption("special_only")}`)
            .then(data => data.json())
            .then(data => resolve(data));
    });
}

// ---------------------- DATE SETUP AND UTILITY METHODS ---------------------- //

/**
 * The date picker doesn't default to the current time. Dates don't automatically adjust to timezones. I hate this.
 * We assume America/Chicago timezone (because that is the timezone the college site is in), 
 *    and parse the locale date into the needed format for date pickers.
 */
// TODO: split into 2 functions for constant current date?
function initializeDateInput() {
    // DD/MM/YYYY
    todayDate = new Date().toLocaleDateString("en-US", {
        timeZone: "America/Chicago"
    });

    // => YYYY-MM-DD
    filterDatePicker.value = DMY_to_YMD(todayDate, "-");
}

/**
 * Converts a date in the format DD/MM/YYYY to YYYY/MM/DD
 */
function DMY_to_YMD(date, outputDelimiter) {
    const todayElements = date.split("/");
    // return todayElements[2] + "-" + todayElements[0].padStart(2, "0") + "-" + todayElements[1].padStart(2, "0")
    return `${todayElements[2]}${outputDelimiter}${todayElements[0].padStart(2, "0")}${outputDelimiter}${todayElements[1].padStart(2, "0")}`
}

// ---------------------- READING AND WRITING DATA FROM LOCAL STORAGE ---------------------- //

function validateOptions() {
    // If the options object does not exist in localStorage, create it with default values.
    if(!localStorage.getItem("options")) {
        localStorage.setItem("options", JSON.stringify(defaultOptions));
    }
}

/**
 * Reads a single option from the user's preferences.
 * @param {String} key option key to read from preferences
 */
function readOption(key) {
    validateOptions();

    // If the specific property does not exist, create it now.
    // Ensure the property exists in the default options map before creating it.
    if (!localStorage.getItem("options").key) {
        if(key in defaultOptions) {
            localStorage.getItem("options")[key] = defaultOptions[key];
        }
    }

    return JSON.parse(localStorage.getItem("options"))[key];
}

/**
 * Writes a single option to local storage.
 * @param {String} key option key to write
 * @param {String} value value of the option
 */
function writeOption(key, value) {
    validateOptions();
    var current = JSON.parse(localStorage.getItem("options"));
    current[key] = value;
    localStorage.setItem("options", JSON.stringify(current));
}

// ---------------------- OPTIONS TOGGLE ---------------------- //

const hideOptionsButton = document.getElementById("options-toggle");
const optionsDiv = document.getElementById("options");
const hrAfterOptions = document.getElementById("hr-after-options");
var visible = true;

hideOptionsButton.addEventListener('click', event => {
    visible = !visible;
    writeOption("hide_options", !visible);
    optionsDiv.style.display = visible ? 'grid' : 'none';
    hrAfterOptions.style.display = visible ? 'block' : 'none';
    hideOptionsButton.innerHTML = visible ? 'hide options' : 'show options';
});

// Load visibility for options on page load
const hideOptions = readOption("hide_options");
if(hideOptions) {
    visible = false;
    optionsDiv.style.display = 'none';
    hrAfterOptions.style.display = 'none';
    hideOptionsButton.innerHTML = 'show options';
}

// ---------------------- DAYPART SWITCHING ---------------------- //

const breakfastButton = document.getElementById("daypart-breakfast");
const lunchButton = document.getElementById("daypart-lunch");
const dinnerButton = document.getElementById("daypart-dinner");
const allButton = document.getElementById("daypart-all");

// Register click handler for each daypart button
Array.from(document.getElementsByClassName("daypart-select")).forEach(element => {
    element.addEventListener('click', event => {
        // On click, clear all daypart active tags...
        Array.from(document.getElementsByClassName("daypart-select")).forEach(sub => {
            sub.classList.remove("daypart-active");
        });

        // Then set the clicked element to active
        element.classList.add("daypart-active");

        // Record string of current phase
        selectedDaypart = element.id.replace("daypart-", "");
        refreshDisplay();
    });
});

// ---------------------- FILTERS ---------------------- //

Array.from(document.getElementsByClassName("filter-checkbox")).forEach(element => {
    element.addEventListener('click', event => {
        writeOption(event.target.value, event.target.checked);
        refreshDisplay();
    });
});

// Page has loaded, assign buttons to values from options
// TODO: include other buttons here?
Array.from(document.getElementsByClassName("filter-checkbox")).forEach(element => {
    if(readOption(element.value)) {
        element.checked = true;
    }
});

// ---------------------- DATE PICKER CHANGE HANDLERS ---------------------- //
filterDatePicker.addEventListener('change', event => {
    displayMenu(filterDatePicker.value);
});