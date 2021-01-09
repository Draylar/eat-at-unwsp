const router = require('express').Router();
const menu = require('./menu');
const rateLimit = require('express-rate-limit');

// Rate limiting. By default, IPs can send a maximum of 100 requests within an hour.
const limiter = rateLimit({
    windowMs: 1000 * 60 * 60, // 1 hour window
    max: 100, // maximum of 100 requests in an hour,
    message: {
        error: "You have hit the maximum number of requests within the last hour (100). Please wait and try again later."
    }
});

/**
 * Returns the "primary" menu for the given date.
 * A primary menu contains all items marked as special.
 */
router.get('/menu', limiter, (request, response) => {
    const date = request.query.date;
    const primary = request.query.primary;

    if (date) {
        const parsed = date.split("-");

        // todo: validate parsed date input from query parma
        if (parsed.length == 3) {
            menu.getData(date, data => {
                if((primary == undefined || JSON.parse(primary.toLowerCase())) && data.items !== undefined) {
                    // Filter items by special-only
                    data.items = data.items.filter(item => item.special);
                }

                response.send(data);
            }, {
                fields: "date items.id items.filters items.label items.availability items.special items.description items.price items.station"
            });

            return;
        }
    }

    response.send({
        error: "/api/menu call requires a date in the format of YYYY-MM-DD."
    });
});

module.exports = router;