const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MenuSchema = new Schema({
    date: String,
    empty: Boolean,
    updated: Date,
    items: [{
        _id: false,
        id: Number,
        label: String,
        description: String,
        raw_cooked: Boolean,
        is_rotating: Boolean,
        zero_entree: Boolean,
        cor_icon: [{
            _id: false,
            id: Number,
            label: String
        }],
        ordered_cor_icon: [{
            _id: false,
            prefix: String,
            id: Number,
            label: String
        }],
        nextepid: String,
        price: String,
        nutrition: [{
            _id: false,
            key: String,
            value: String
        }],
        special: Boolean,
        tier3: Boolean,
        tier: Number,
        rating: Number,
        connector: String,
        station_id: Number,
        station: String,
        nutrition_details: [{
            _id: false,
            category: String,
            label: String,
            value: String,
            unit: String
        }],
        ingredients: String,
        nutrition_link: String,
        sub_station_id: Number,
        sub_station: String,
        sub_station_order: Number,
        availability: [String],
        filters: {
            _id: false,
            gluten_free: Boolean,
            vegan: Boolean,
            well_being: Boolean,
            vegetarian: Boolean
        }
    }],
    dayparts: [{
        _id: false,
        starttime: String,
        endtime: String,
        id: Number,
        label: String,
        abbreviation: String,
        message: String,
        stations: [{
            _id: false,
            order_id: String,
            id: Number,
            label: String,
            price: String,
            note: String,
            soup: Boolean,
            image: String,
            items: [ Number ]
        }],
        print_urls: {
            _id: false,
            day: String,
            week: String
        },
        starttime_formatted: String,
        endtime_formatted: String,
        time_formatted: String
    }]
});

const MenuModel = mongoose.model('Menu', MenuSchema);
module.exports = MenuModel;