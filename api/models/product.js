const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-aggregate-paginate-v2');

// Creating product schema
const productSchema = new mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        index: true,
        required: true
    },
    title: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        lowercase: true,
        index: true
    },
    colours: {
        type: [ String ],
        required: true,
        minlength: 1
    },
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    price: {
        type: Number,
        required: true
    },
    productImages : {
        type: [ String ],
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Adding plugin to the schema
productSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("Product", productSchema);