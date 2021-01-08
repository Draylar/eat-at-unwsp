const fetch = require('node-fetch');

// new db
// each element has a date, a list of items, and items per section of the day
const Menu = require('./database/menu_schema');

// constants for processing
const idToFilters = {
    4: "vegan",
    9: "gluten_free",
    1: "vegetarian",
    5: "well_being"
}


function getData(date, callback, options) {
    // add empty/updated/date if not present
    options.fields = `${options.fields} updated date empty`;

    Menu.findOne({ date: date }, { _id: 0 })
        .select(options == undefined || options.fields == undefined ? "" : options.fields)
        .exec((error, menu) => {
            if (error) return error;

            var bypass = false;

            if (menu !== null) {
                if (menu.empty) {
                    const lastUpdated = menu.updated;
                    const TWO_HOURS = 1000 * 60 * 60 * 2;

                    if (((new Date()) - lastUpdated) > TWO_HOURS) {
                        console.log(`Last check for empty menu on ${date} was more than 2 hours ago; authorizing bypass.`);
                        bypass = true;
                        Menu.deleteMany({ date: date }, (err, result) => {
                            if(error) return error;
                        });
                    } else {
                        console.log(`Last check for empty menu on ${date} was less than 2 hours ago; returning empty error.`);

                        callback({
                            error: "No data was found for the given date!"
                        });

                        return;
                    }
                }
            }

            // No data for the given date was found.
            if (menu == null || bypass) {
                // Fetch data for date
                const dateValidation = validateDate(date);

                // If the validation failed, return the details
                if (dateValidation.success == false) {
                    callback({
                        error: dateValidation.details
                    });

                    return;
                }

                // Date is valid. Send request to bamco, save data, and send back to user
                retrieveData(date, data => {
                    if (data.error == undefined) {
                        // Data returned by method has date, menu, breakfast, lunch, and dinner properties.
                        // Menu schema has date, items, and dayparts (where the key for a daypart is breakfast, lunch, or dinner).
                        const items = [];

                        if (data.items !== undefined) {
                            for (id in data.items) {
                                const item = data.items[id];

                                // TODO: put this in separate function
                                // nutrition_details is a k/v pair between a category and values of that type.
                                // we need to take the category label and bring it down into the object with the label "type".
                                const nutritionDetails = item.nutrition_details;
                                item.nutrition_details = [];

                                for (category in nutritionDetails) {
                                    const detail = nutritionDetails[category];

                                    item.nutrition_details.push({
                                        category: category,
                                        label: detail.label,
                                        value: detail.value,
                                        unit: detail.unit
                                    });
                                }

                                // station text is surrounded by <stong> elements for some reason (a flag?), remove them now
                                item.station = item.station.replace("<strong>", "").replace("</strong>", "").replace("@", "");

                                // daypart (breakfast, lunch, dinner) information is stored separately, but it is nice to attach it to the
                                // specific meal/item for use in return values. We do that now:
                                // Format: `n:j`[], where n is the daypart, and j is the station.
                                const dayparts = ["breakfast", "lunch", "dinner"];
                                const availability = [];

                                dayparts.forEach(daypart => {
                                    data[daypart].stations.forEach(station => {
                                        const stationLabel = station.label;

                                        if (station.items.includes(item.id)) {
                                            availability.push(`${daypart}:${stationLabel}`);
                                        }
                                    });
                                });

                                // vegan/vegetarian/gluten-free/well-being
                                const corIcon = item.cor_icon; // cor_icon properties defines whether the item meets filters like vegan

                                item.filters = {
                                    gluten_free: false,
                                    vegan: false,
                                    well_being: false,
                                    vegetarian: false
                                }

                                for (var key in corIcon) {
                                    // convert numerical ID to string id of filter
                                    const name = idToFilters[key];

                                    if (name !== undefined) {
                                        item.filters[name] = true;
                                    }
                                }

                                item.availability = availability;
                                items.push(item);
                            }
                        } else {
                            callback({
                                error: "Something went wrong while parsing the data for your request!"
                            });
                        }

                        new Menu({
                            date: date,
                            empty: false,
                            updated: new Date(),
                            items: items,
                            dayparts: [
                                data.breakfast,
                                data.lunch,
                                data.dinner
                            ]
                        }).save().then(newMenu => {
                            getData(date, callback, options);
                            return;
                        });
                    } else {
                        if (data.empty) {
                            // save empty data into db for tracking
                            new Menu({
                                date: date,
                                empty: true,
                                updated: new Date(),
                                items: [],
                                dayparts: []
                            }).save().then(newMenu => {
                                console.log(`Saved empty data for ${date} to databse.`);
                            });
                        }

                        callback({
                            error: data.error
                        });
                    }
                });

            } else {
                console.log(`Data for ${date} was found in database.`);

                const menuObj = menu.toObject();
                delete menuObj.empty;
                delete menuObj.updated;
                
                callback(menuObj);
            }
        });
}

function validateDate(date) {
    if (date == null) {
        return {
            success: false,
            details: `Date must be in format YYYY-MM-DD. Found a null value / no query parameters.`
        };
    }

    const splitDate = date.split("-");

    // Validate that the date has 3 sections (a-b-c)
    if (splitDate.length !== 3) {
        return {
            success: false,
            details: `Date must be in format YYYY-MM-DD. Found ${splitDate.length} elements in ${date}.`
        };
    }

    // Validate year, month, and day section
    const year = splitDate[0];
    const month = splitDate[1].padStart(2, '0');
    const day = splitDate[2].padStart(2, '0');

    // Check length for each param (must be 4, 2, 2).
    if (year.length !== 4 || month.length !== 2 || day.length !== 2) {
        return {
            success: false,
            details: `Date must be in format YYYY-MM-DD. One or more of the elements passed in with ${date} was the wrong length!`
        };
    }

    // Check that each element is a valid number
    if (!Number.isInteger(parseInt(year)) || !Number.isInteger(parseInt(month)) || !Number.isInteger(parseInt(day))) {
        return {
            success: false,
            details: `Date must be in format YYYY-MM-DD. One or more of the elements passed in with ${date} was not a number!`
        };
    }

    // Ensure month is <=12, year is >=2010, day is <=31
    if (!((year >= 2010 && year <= 2050) && (month >= 1 && month <= 12) && (day >= 1 && day <= 31))) {
        return {
            success: false,
            details: `Date must be in format YYYY[2010 <= y <= 2050]-MM[1 <= m <= 12]-DD[1 <= d <= 31]. One or more of the elements passed in with ${date} did not pass the numerical restrictions!`
        };
    }

    return {
        success: true
    }
}

function retrieveData(date, callback) {
    const url = `https://unwsp.cafebonappetit.com/cafe/the-dining-center/${date}/`;
    console.log(`web call URL for ${date}: ${url}`);

    fetch(url)
        .then(data => data.text())
        .then(data => {
            // TODO: WHAT HAPPENS WHEN THE WEBPAGE IS INVALID (THERE ARE NO ITEMS)?????
            // SEND ERR BACK TO USER INSTEAD OF SAVING TO DB

            console.log(`Data retrieved from ${url}. Length: ${data.length}`);

            // Page doesn't include Bamco object when there are no menu items, so it is a reliable[?] way to check for days without menus
            if (!data.includes("Bamco.")) {
                console.log(`No data was found for ${date}.`);

                callback({
                    error: "No data was found for the given date!",
                    empty: true
                });

                return;
            }

            // Parse out important data
            const startIndex = data.indexOf("Bamco.menu_items = ") + "Bamco.menu_items = ".length;
            const endIndex = data.indexOf("Bamco.cor_icons = ", startIndex); // substring still has an extra ; at the end, so we need to remove it
            var fullMenu = data.substring(startIndex, endIndex).trim();
            fullMenu = fullMenu.substring(0, fullMenu.lastIndexOf(";")); // get rid of trailing ;

            console.log(`Full menu retrieved from ${url}. Length: ${fullMenu.length}`);

            // Breakfast
            const breakfast = parseDaypart(data, 1);
            const lunch = parseDaypart(data, 3);
            const dinner = parseDaypart(data, 4);

            callback({
                date: date,
                items: JSON.parse(fullMenu),
                breakfast: JSON.parse(breakfast),
                lunch: JSON.parse(lunch),
                dinner: JSON.parse(dinner)
            });
        })
        .catch(error => {
            console.log(error);

            callback({
                error: "Something went wrong while processing your request!"
            });
        });
}

function parseDaypart(data, daypart) {
    const startIndex = data.indexOf(`Bamco.dayparts['${daypart}'] = `) + `Bamco.dayparts['${daypart}'] = `.length;
    const endIndex = data.indexOf("})();", startIndex);
    var daypart = data.substring(startIndex, endIndex).trim();
    return daypart.substring(0, daypart.lastIndexOf(";")); // get rid of trailing ;
}

module.exports = {
    getData
}